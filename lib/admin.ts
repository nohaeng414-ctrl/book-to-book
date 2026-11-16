import { auth } from "@/auth";

export function isAdminEmail(email?: string | null): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;

  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  const allowedEmails = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(normalized);
}

/** Admin access is granted only to explicitly configured accounts. */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}