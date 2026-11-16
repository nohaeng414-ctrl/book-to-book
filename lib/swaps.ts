import {
  PointTransactionType,
  Prisma,
  SwapStatus,
  SwapType,
} from "@/generated/prisma-full";
import { prisma } from "@/lib/prisma";

export const AUTO_CONFIRM_HOURS = 48;
export const AUTO_CONFIRM_MS = AUTO_CONFIRM_HOURS * 60 * 60 * 1000;

export const COMPLAINT_WINDOW_DAYS = 7;
export const COMPLAINT_WINDOW_MS = COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type SwapInput = {
  requestedBookId: string;
  type: SwapType;
  offeredBookIds?: string[];
};

export class SwapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwapError";
  }
}

type SettleableSwap = {
  id: string;
  type: SwapType;
  requesterId: string;
  receiverId: string;
  requestedBookId: string;
  offeredBookId: string | null;
  offeredBookIds: string[];
  pointsCost: number;
};

// دالة مشتركة لإتمام الطلب ونقل ملكية الكتب وتسوية النقاط بأمان
async function finalizeSwapCompletion(
  tx: Prisma.TransactionClient,
  swap: SettleableSwap,
  now: Date
) {
  const completed = await tx.swap.updateMany({
    where: {
      id: swap.id,
      status: {
        in: [
          SwapStatus.ACCEPTED,
          SwapStatus.AWAITING_DELIVERY,
          SwapStatus.AWAITING_CONFIRMATION,
        ],
      },
    },
    data: {
      deliveryConfirmed: true,
      receiptConfirmed: true,
      status: SwapStatus.COMPLETED,
      completedAt: now,
    },
  });

  if (completed.count !== 1) {
    throw new SwapError("تم تحديث الطلب في جلسة أخرى؛ حدّث الصفحة.");
  }

  // نقل ملكية الكتاب المطلوب إلى صاحب الطلب
  const receivedBook = await tx.book.updateMany({
    where: {
      id: swap.requestedBookId,
      ownerId: swap.receiverId,
      isAvailable: false,
    },
    data: { ownerId: swap.requesterId, isAvailable: true },
  });
  if (receivedBook.count !== 1) {
    throw new SwapError("تعذر نقل ملكية الكتاب؛ لم تُسجّل العملية.");
  }

  // في التبادل المباشر: نقل جميع الكتب المختارة إلى صاحب الكتاب المطلوب
  if (swap.type === SwapType.DIRECT) {
    const allOfferedIds = [
      ...new Set(
        [
          ...(swap.offeredBookIds ?? []),
          ...(swap.offeredBookId ? [swap.offeredBookId] : []),
        ].filter(Boolean)
      ),
    ];

    if (allOfferedIds.length === 0) {
      throw new SwapError("بيانات الكتب المعروضة في المبادلة غير مكتملة.");
    }

    const offeredBooksResult = await tx.book.updateMany({
      where: {
        id: { in: allOfferedIds },
        ownerId: swap.requesterId,
        isAvailable: false,
      },
      data: { ownerId: swap.receiverId, isAvailable: true },
    });
    if (offeredBooksResult.count !== allOfferedIds.length) {
      throw new SwapError("تعذر نقل ملكية الكتب المعروضة؛ لم تُسجّل العملية.");
    }
  }

  // تسوية النقاط (سواء في طلب النقاط أو فرق النقاط في التبادل المباشر)
  if (swap.pointsCost > 0) {
    const spent = await tx.user.updateMany({
      where: {
        id: swap.requesterId,
        points: { gte: swap.pointsCost },
        reservedPoints: { gte: swap.pointsCost },
      },
      data: {
        points: { decrement: swap.pointsCost },
        reservedPoints: { decrement: swap.pointsCost },
      },
    });
    if (spent.count !== 1) {
      throw new SwapError("تعذر تسوية النقاط المحجوزة؛ لم تُسجّل العملية.");
    }
    await tx.user.update({
      where: { id: swap.receiverId },
      data: { points: { increment: swap.pointsCost } },
    });
    await tx.pointTransaction.createMany({
      data: [
        {
          userId: swap.requesterId,
          amount: -swap.pointsCost,
          type: PointTransactionType.SPENT,
          swapId: swap.id,
          idempotencyKey: `swap:${swap.id}:spent`,
          description:
            swap.type === SwapType.POINTS
              ? "شراء كتاب بعد تأكيد الاستلام"
              : "دفع فرق النقاط في تبادل الكتب",
        },
        {
          userId: swap.receiverId,
          amount: swap.pointsCost,
          type: PointTransactionType.EARNED,
          swapId: swap.id,
          idempotencyKey: `swap:${swap.id}:earned`,
          description:
            swap.type === SwapType.POINTS
              ? "بيع كتاب بعد تأكيد الاستلام"
              : "استلام فرق النقاط في تبادل الكتب",
        },
      ],
    });
  }
}

// فحص وإتمام الطلب تلقائياً عند انقضاء مهلة 48 ساعة على تأكيد الطرف الأول
export async function autoCompleteExpiredSwap(swapId: string): Promise<boolean> {
  const candidate = await prisma.swap.findUnique({
    where: { id: swapId },
    select: { status: true, updatedAt: true },
  });

  if (!candidate || candidate.status !== SwapStatus.AWAITING_CONFIRMATION) {
    return false;
  }

  if (Date.now() - candidate.updatedAt.getTime() < AUTO_CONFIRM_MS) {
    return false;
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const swap = await tx.swap.findUnique({
          where: { id: swapId },
          select: {
            id: true,
            type: true,
            status: true,
            requesterId: true,
            receiverId: true,
            requestedBookId: true,
            offeredBookId: true,
            offeredBookIds: true,
            pointsCost: true,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            updatedAt: true,
          },
        });

        if (!swap || swap.status !== SwapStatus.AWAITING_CONFIRMATION) {
          return false;
        }

        const now = new Date();
        if (now.getTime() - swap.updatedAt.getTime() < AUTO_CONFIRM_MS) {
          return false;
        }

        await finalizeSwapCompletion(tx, swap, now);

        const firstConfirmerId = swap.deliveryConfirmed
          ? swap.receiverId
          : swap.requesterId;

        await tx.message.create({
          data: {
            swapId: swap.id,
            senderId: firstConfirmerId,
            content:
              "اكتمل الطلب تلقائياً لمرور 48 ساعة على تأكيد التسليم دون اعتراض.",
          },
        });

        return true;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      }
    );
  } catch {
    return false;
  }
}

export async function createSwap(requesterId: string, input: SwapInput) {
  if (!input.requestedBookId || !Object.values(SwapType).includes(input.type)) {
    throw new SwapError("بيانات الطلب غير مكتملة.");
  }

  return prisma.$transaction(
    async (tx) => {
      const [requester, requestedBook] = await Promise.all([
        tx.user.findUnique({
          where: { id: requesterId },
          select: {
            id: true,
            isBanned: true,
            points: true,
            reservedPoints: true,
          },
        }),
        tx.book.findUnique({
          where: { id: input.requestedBookId },
          select: {
            id: true,
            ownerId: true,
            points: true,
            isAvailable: true,
            isDeleted: true,
          },
        }),
      ]);

      if (!requester || requester.isBanned) {
        throw new SwapError("حسابك موقوف ولا يمكنك إرسال طلبات تبادل.");
      }

      if (!requestedBook || !requestedBook.isAvailable || requestedBook.isDeleted) {
        throw new SwapError("الكتاب لم يعد متاحاً.");
      }
      if (requestedBook.ownerId === requesterId) {
        throw new SwapError("لا يمكنك طلب كتابك.");
      }
      if (
        !Number.isInteger(requestedBook.points) ||
        requestedBook.points < 1 ||
        requestedBook.points > 3
      ) {
        throw new SwapError("قيمة نقاط هذا الكتاب غير صالحة.");
      }

      let offeredBookIds: string[] = [];
      if (input.type === SwapType.DIRECT) {
        offeredBookIds = [...new Set(input.offeredBookIds ?? [])].filter(Boolean);

        // جلب كتب صاحب الطلب المتاحة التي لا تتجاوز قيمة كل منها نقاط الكتاب المطلوب
        const eligibleBooks = await tx.book.findMany({
          where: {
            ownerId: requesterId,
            isAvailable: true,
            isDeleted: false,
            points: { lte: requestedBook.points },
          },
          select: { id: true, points: true },
        });

        if (eligibleBooks.length === 0) {
          throw new SwapError(
            `يجب أن يكون في مكتبتك كتاب متاح واحد على الأقل بقيمة ${requestedBook.points} نقاط أو أقل لطلب هذا التبادل.`
          );
        }

        const totalEligibleBookPoints = eligibleBooks.reduce(
          (sum, b) => sum + b.points,
          0
        );
        const freeUserPoints = Math.max(
          0,
          requester.points - requester.reservedPoints
        );

        if (totalEligibleBookPoints + freeUserPoints < requestedBook.points) {
          throw new SwapError(
            "مجموع نقاط كتبك المتاحة ورصيدك من النقاط لا يكفيان لتغطية قيمة هذا الكتاب."
          );
        }
      }

      const lockedRequest = await tx.book.updateMany({
        where: {
          id: requestedBook.id,
          ownerId: requestedBook.ownerId,
          isAvailable: true,
        },
        data: { isAvailable: false },
      });
      if (lockedRequest.count !== 1) {
        throw new SwapError("الكتاب حُجز في طلب آخر.");
      }

      if (input.type === SwapType.POINTS) {
        const reserved = await tx.$executeRaw`
          UPDATE "User"
          SET "reservedPoints" = "reservedPoints" + ${requestedBook.points}, "updatedAt" = NOW()
          WHERE "id" = ${requesterId}
            AND "points" - "reservedPoints" >= ${requestedBook.points}
        `;
        if (reserved !== 1) {
          throw new SwapError("رصيدك المتاح من النقاط لا يكفي لهذا الكتاب.");
        }
      }

      const createdSwap = await tx.swap.create({
        data: {
          type: input.type,
          requesterId,
          receiverId: requestedBook.ownerId,
          requestedBookId: requestedBook.id,
          offeredBookIds,
          pointsCost: input.type === SwapType.POINTS ? requestedBook.points : 0,
        },
      });

      if (input.type === SwapType.POINTS) {
        await tx.pointTransaction.create({
          data: {
            userId: requesterId,
            amount: requestedBook.points,
            type: PointTransactionType.RESERVED,
            swapId: createdSwap.id,
            idempotencyKey: `swap:${createdSwap.id}:reserved`,
            description: "حجز نقاط لطلب كتاب",
          },
        });
      }

      return createdSwap;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 20000,
    }
  );
}

type SwapAction = "accept" | "reject" | "cancel" | "delivery" | "receipt";

async function prunePendingDirectRequests(
  tx: Prisma.TransactionClient,
  requesterId: string,
  acceptedSwapId: string,
  consumedBookIds: string[]
) {
  const remainingAvailableBooks = await tx.book.count({
    where: {
      ownerId: requesterId,
      isAvailable: true,
      isDeleted: false,
    },
  });

  const pendingRequests = await tx.swap.findMany({
    where: {
      requesterId,
      id: { not: acceptedSwapId },
      type: SwapType.DIRECT,
      status: SwapStatus.PENDING,
    },
    select: {
      id: true,
      requestedBookId: true,
      offeredBookIds: true,
    },
  });
  if (pendingRequests.length === 0) return;

  for (const request of pendingRequests) {
    const updatedOfferedIds = request.offeredBookIds.filter(
      (id) => !consumedBookIds.includes(id)
    );

    if (remainingAvailableBooks === 0) {
      const cancelled = await tx.swap.updateMany({
        where: { id: request.id, status: SwapStatus.PENDING },
        data: {
          status: SwapStatus.CANCELLED,
          cancelReason: "BOOK_NO_LONGER_AVAILABLE",
          offeredBookIds: [],
        },
      });
      if (cancelled.count === 1) {
        await tx.book.updateMany({
          where: {
            id: request.requestedBookId,
            isAvailable: false,
            isDeleted: false,
          },
          data: { isAvailable: true },
        });
      }
    } else if (request.offeredBookIds.length > 0) {
      await tx.swap.updateMany({
        where: { id: request.id, status: SwapStatus.PENDING },
        data: { offeredBookIds: updatedOfferedIds },
      });
    }
  }
}

export async function transitionSwap(
  userId: string,
  swapId: string,
  action: SwapAction,
  selectedOfferedBookIds?: string | string[]
) {
  return prisma.$transaction(
    async (tx) => {
      const [actor, swap] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { id: true, isBanned: true },
        }),
        tx.swap.findUnique({
          where: { id: swapId },
          select: {
            id: true,
            type: true,
            status: true,
            requesterId: true,
            receiverId: true,
            requestedBookId: true,
            offeredBookId: true,
            offeredBookIds: true,
            pointsCost: true,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            completedAt: true,
            updatedAt: true,
          },
        }),
      ]);

      if (!actor || actor.isBanned) {
        throw new SwapError("حسابك موقوف ولا يمكنك تنفيذ هذا الإجراء.");
      }

      if (!swap) throw new SwapError("الطلب غير موجود.");

      if (
        (action === "accept" || action === "reject") &&
        swap.receiverId !== userId
      ) {
        throw new SwapError("لا تملك صلاحية تعديل هذا الطلب.");
      }
      if (action === "receipt" && swap.requesterId !== userId) {
        throw new SwapError("لا تملك صلاحية تعديل هذا الطلب.");
      }
      if (
        action === "cancel" &&
        swap.requesterId !== userId &&
        swap.receiverId !== userId
      ) {
        throw new SwapError("لا تملك صلاحية إلغاء هذا الطلب.");
      }
      if (action === "delivery" && swap.receiverId !== userId) {
        throw new SwapError("تأكيد التسليم متاح لصاحب الكتاب فقط.");
      }

      if (action === "accept") {
        if (swap.status === SwapStatus.AWAITING_DELIVERY) return swap;

        let primaryOfferedBookId = swap.offeredBookId;
        let finalOfferedBookIds = swap.offeredBookIds;
        let pointsCost = swap.pointsCost;

        if (swap.type === SwapType.DIRECT) {
          const normalizedSelectedIds = Array.isArray(selectedOfferedBookIds)
            ? [...new Set(selectedOfferedBookIds.filter(Boolean))]
            : selectedOfferedBookIds
            ? [selectedOfferedBookIds]
            : [];

          if (normalizedSelectedIds.length === 0) {
            throw new SwapError(
              "يرجى اختيار كتاب واحد على الأقل من مكتبة صاحب الطلب."
            );
          }

          const [requestedBook, selectedBooks] = await Promise.all([
            tx.book.findUnique({
              where: { id: swap.requestedBookId },
              select: { points: true },
            }),
            tx.book.findMany({
              where: {
                id: { in: normalizedSelectedIds },
                ownerId: swap.requesterId,
                isDeleted: false,
              },
              select: { id: true, points: true, isAvailable: true },
            }),
          ]);

          if (!requestedBook) {
            throw new SwapError("الكتاب المطلوب غير موجود.");
          }
          if (selectedBooks.length !== normalizedSelectedIds.length) {
            throw new SwapError("أحد الكتب المختارة غير موجود في مكتبة القارئ.");
          }

          const selectedBooksPoints = selectedBooks.reduce(
            (sum, b) => sum + b.points,
            0
          );

          if (selectedBooksPoints > requestedBook.points) {
            throw new SwapError(
              `مجموع نقاط الكتب المختارة (${selectedBooksPoints}) لا يمكن أن يتجاوز نقاط كتابك (${requestedBook.points}).`
            );
          }

          // قفل الكتب المختارة لصالح هذا التبادل
          const lockedOffers = await tx.book.updateMany({
            where: {
              id: { in: normalizedSelectedIds },
              ownerId: swap.requesterId,
              isAvailable: true,
              isDeleted: false,
            },
            data: { isAvailable: false },
          });

          if (lockedOffers.count !== normalizedSelectedIds.length) {
            throw new SwapError(
              "أحد الكتب المختارة لم يعد متاحاً؛ يرجى تحديث الاختيار."
            );
          }

          // حساب فرق النقاط وحجزه من رصيد صاحب الطلب إن وُجد
          const pointsDiff = requestedBook.points - selectedBooksPoints;
          if (pointsDiff > 0) {
            const reserved = await tx.$executeRaw`
              UPDATE "User"
              SET "reservedPoints" = "reservedPoints" + ${pointsDiff}, "updatedAt" = NOW()
              WHERE "id" = ${swap.requesterId}
                AND "points" - "reservedPoints" >= ${pointsDiff}
            `;
            if (reserved !== 1) {
              throw new SwapError(
                `رصيد صاحب الطلب من النقاط لا يكفي لتغطية فرق النقاط (${pointsDiff} نقاط).`
              );
            }

            await tx.pointTransaction.create({
              data: {
                userId: swap.requesterId,
                amount: pointsDiff,
                type: PointTransactionType.RESERVED,
                swapId: swap.id,
                idempotencyKey: `swap:${swap.id}:reserved`,
                description: "حجز فرق النقاط في تبادل الكتب",
              },
            });
          }

          primaryOfferedBookId = normalizedSelectedIds[0];
          finalOfferedBookIds = normalizedSelectedIds;
          pointsCost = pointsDiff;
        }

        const changed = await tx.swap.updateMany({
          where: {
            id: swap.id,
            receiverId: userId,
            status: SwapStatus.PENDING,
          },
          data: {
            status: SwapStatus.AWAITING_DELIVERY,
            offeredBookId: primaryOfferedBookId,
            offeredBookIds: finalOfferedBookIds,
            pointsCost,
          },
        });
        if (changed.count !== 1) {
          throw new SwapError("تغيرت حالة الطلب؛ حدّث الصفحة وحاول مجدداً.");
        }

        if (swap.type === SwapType.DIRECT && finalOfferedBookIds.length > 0) {
          await prunePendingDirectRequests(
            tx,
            swap.requesterId,
            swap.id,
            finalOfferedBookIds
          );
        }

        return {
          ...swap,
          offeredBookId: primaryOfferedBookId,
          offeredBookIds: finalOfferedBookIds,
          pointsCost,
          status: SwapStatus.AWAITING_DELIVERY,
        };
      }

      if (action === "reject" || action === "cancel") {
        // يُمنع الإلغاء نهائياً بمجرد تأكيد أحد الطرفين للتسليم
        const canCancelAfterAcceptance =
          action === "cancel" &&
          (swap.status === SwapStatus.ACCEPTED ||
            swap.status === SwapStatus.AWAITING_DELIVERY) &&
          !swap.deliveryConfirmed &&
          !swap.receiptConfirmed;

        const canCancelPending =
          action === "cancel" &&
          swap.status === SwapStatus.PENDING &&
          swap.requesterId === userId;

        if (
          action === "cancel" &&
          !canCancelAfterAcceptance &&
          !canCancelPending
        ) {
          throw new SwapError(
            "لا يمكن إلغاء الطلب بعد تأكيد أحد الطرفين للتسليم؛ يمكنك رفع شكوى إذا واجهت مشكلة."
          );
        }
        if (action === "reject" && swap.status !== SwapStatus.PENDING) {
          throw new SwapError("لا يمكن رفض الطلب بعد بدء التبادل.");
        }
        const nextStatus =
          action === "reject" ? SwapStatus.REJECTED : SwapStatus.CANCELLED;
        if (swap.status === nextStatus) return swap;
        const changed = await tx.swap.updateMany({
          where: {
            id: swap.id,
            status: swap.status,
            ...(action === "reject" ? { receiverId: userId } : {}),
            ...(canCancelAfterAcceptance
              ? { deliveryConfirmed: false, receiptConfirmed: false }
              : {}),
            ...(canCancelPending ? { requesterId: userId } : {}),
          },
          data: { status: nextStatus },
        });
        if (changed.count !== 1) {
          throw new SwapError("لا يمكن إلغاء هذا الطلب بعد بدء التبادل.");
        }

        // إعادة إتاحة الكتاب المطلوب
        await tx.book.updateMany({
          where: { id: swap.requestedBookId, isAvailable: false },
          data: { isAvailable: true },
        });

        // إعادة إتاحة جميع الكتب المعروضة التي قُفلت عند القبول
        if (canCancelAfterAcceptance) {
          const lockedOfferIds = [
            ...new Set(
              [
                ...(swap.offeredBookIds ?? []),
                ...(swap.offeredBookId ? [swap.offeredBookId] : []),
              ].filter(Boolean)
            ),
          ];
          if (lockedOfferIds.length > 0) {
            await tx.book.updateMany({
              where: { id: { in: lockedOfferIds }, isAvailable: false },
              data: { isAvailable: true },
            });
          }
        }

        // تحرير النقاط المحجوزة (سواء لطلب نقاط كامل أو فرق نقاط في تبادل مباشر مقبول)
        const hasReservedPoints =
          swap.pointsCost > 0 &&
          (swap.type === SwapType.POINTS || canCancelAfterAcceptance);

        if (hasReservedPoints) {
          await tx.user.update({
            where: { id: swap.requesterId },
            data: { reservedPoints: { decrement: swap.pointsCost } },
          });
          if (action === "cancel") {
            await tx.pointTransaction.create({
              data: {
                userId: swap.requesterId,
                amount: swap.pointsCost,
                type: PointTransactionType.RELEASED,
                swapId: swap.id,
                idempotencyKey: `swap:${swap.id}:released`,
                description: "تحرير نقاط بعد إلغاء طلب التبادل",
              },
            });
          }
        }
        return { ...swap, status: nextStatus };
      }

      // تأكيد التسليم/الاستلام مع مهلة 48 ساعة للتأكيد التلقائي
      if (action === "delivery" || action === "receipt") {
        if (
          swap.status === SwapStatus.COMPLETED &&
          swap.deliveryConfirmed &&
          swap.receiptConfirmed
        ) {
          return swap;
        }

        const allowedStatuses: SwapStatus[] = [
          SwapStatus.ACCEPTED,
          SwapStatus.AWAITING_DELIVERY,
          SwapStatus.AWAITING_CONFIRMATION,
        ];
        if (!allowedStatuses.includes(swap.status)) {
          throw new SwapError("لا يمكن تأكيد التسليم في حالة الطلب الحالية.");
        }

        const now = new Date();
        const isReceiverConfirming = action === "delivery";
        const myConfirmed = isReceiverConfirming
          ? swap.deliveryConfirmed
          : swap.receiptConfirmed;
        const otherConfirmed = isReceiverConfirming
          ? swap.receiptConfirmed
          : swap.deliveryConfirmed;

        // إذا انقضت مهلة 48 ساعة بالفعل أثناء انتظار الطرف الثاني، يتم الإتمام فوراً
        if (
          swap.status === SwapStatus.AWAITING_CONFIRMATION &&
          now.getTime() - swap.updatedAt.getTime() >= AUTO_CONFIRM_MS
        ) {
          await finalizeSwapCompletion(tx, swap, now);
          return {
            ...swap,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            status: SwapStatus.COMPLETED,
            completedAt: now,
          };
        }

        // إذا كان هذا الطرف قد أكد مسبقاً
        if (myConfirmed && !otherConfirmed) {
          return swap;
        }

        // الحالة 1: الطرف الآخر أكد مسبقاً -> يكتمل التبادل فوراً بتأكيد الطرفين
        if (otherConfirmed) {
          await finalizeSwapCompletion(tx, swap, now);
          return {
            ...swap,
            deliveryConfirmed: true,
            receiptConfirmed: true,
            status: SwapStatus.COMPLETED,
            completedAt: now,
          };
        }

        // الحالة 2: هذا هو أول تأكيد -> بدء مهلة 48 ساعة وإرسال إشعار في المحادثة
        const changed = await tx.swap.updateMany({
          where: {
            id: swap.id,
            status: swap.status,
            deliveryConfirmed: false,
            receiptConfirmed: false,
          },
          data: {
            deliveryConfirmed: isReceiverConfirming,
            receiptConfirmed: !isReceiverConfirming,
            status: SwapStatus.AWAITING_CONFIRMATION,
          },
        });
        if (changed.count !== 1) {
          throw new SwapError("تعذر تسجيل التأكيد؛ حدّث الصفحة وحاول مجدداً.");
        }

        await tx.message.create({
          data: {
            swapId: swap.id,
            senderId: userId,
            content:
              "تم تأكيد تسليم الكتاب من طرفي. بدأت مهلة 48 ساعة لتأكيد الطرف الآخر، وبعد انتهائها دون اعتراض سيكتمل الطلب تلقائياً.",
          },
        });

        return {
          ...swap,
          deliveryConfirmed: isReceiverConfirming,
          receiptConfirmed: !isReceiverConfirming,
          status: SwapStatus.AWAITING_CONFIRMATION,
        };
      }

      throw new SwapError("الإجراء غير معروف.");
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 20000,
    }
  );
}