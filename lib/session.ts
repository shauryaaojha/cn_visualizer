import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUser, type UserDoc } from "@/lib/users";

/**
 * The signed-in user's full record, or a redirect to /login. Pages that need
 * an account call this first. The session cookie only proves who they are;
 * the document says what they have filled in.
 */
export async function requireUser(from: string): Promise<UserDoc> {
  const session = await auth();
  const user = session?.user?.id ? await getUser(session.user.id) : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(from)}`);
  return user;
}

/** Only relative, same-site paths. Anything else becomes the dashboard, so ?next= can't bounce people off-site. */
export function safeNext(raw: string | string[] | undefined): string {
  const next = Array.isArray(raw) ? raw[0] : raw;
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}
