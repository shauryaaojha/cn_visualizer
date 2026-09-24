// Who is signed in, asked once per page load and shared by everything in the
// browser that needs it (the navbar, progress sync). Lesson pages are
// prerendered, so they learn this from the browser rather than the server.

export interface Me {
  id?: string;
  name?: string | null;
  image?: string | null;
}

let pending: Promise<Me | null> | null = null;

export function getMe(): Promise<Me | null> {
  pending ??= fetch("/api/auth/session")
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { user?: Me } | null) => (s?.user?.id ? s.user : null))
    .catch(() => null);
  return pending;
}
