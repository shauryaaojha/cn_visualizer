"use client";

// The navbar's account slot. It asks /api/auth/session from the browser
// instead of reading the session on the server. Reading cookies in the layout
// would make every lesson page dynamic, and they are meant to stay prerendered.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Me = { name?: string | null; image?: string | null } | null;

export function UserMenu() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | undefined>(undefined);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: Me } | null) => live && setMe(s?.user ?? null))
      .catch(() => live && setMe(null));
    return () => {
      live = false;
    };
  }, []);

  if (me === undefined) return <span className="h-9 w-9" aria-hidden />;

  if (!me) {
    if (pathname === "/login") return null;
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        title="Sign in to save your progress"
        aria-label="Sign in"
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-outline-variant px-2.5 py-1.5 font-sans text-[14px] font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
      >
        <Icon name="login" className="text-[18px]" />
        {/* The unit links crowd the bar from lg up; the label only returns once there is room again. */}
        <span className="hidden sm:inline lg:hidden xl:inline">Sign in</span>
      </Link>
    );
  }

  const initials = (me.name ?? "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href="/dashboard"
      title="Your dashboard"
      aria-label="Your dashboard"
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/70 bg-primary/10 font-mono text-[13px] font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
    >
      {me.image ? (
        // Google/GitHub avatar; next/image would need remotePatterns for both hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </Link>
  );
}
