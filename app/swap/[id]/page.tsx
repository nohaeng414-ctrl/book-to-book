import { redirect } from "next/navigation";

export default async function LegacySwapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/swaps/${encodeURIComponent(id)}`);
}
