import type { ReactNode } from "react";
import { BoardBackground } from "@/components/layout/BoardBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Icon } from "@/components/ui/Icon";

/** The board, the navbar and one centred column. Used by /login, /onboarding and /dashboard. */
export function AccountShell({
  icon,
  eyebrow,
  title,
  blurb,
  width = "max-w-3xl",
  children,
}: {
  icon: string;
  eyebrow: string;
  title: string;
  blurb?: ReactNode;
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <BoardBackground />
      <Navbar />
      <div className="scroll-thin mt-16 flex-1 overflow-y-auto">
        <main className={`chalk-in mx-auto w-full ${width} px-gutter py-xl sm:px-margin`}>
          <header className="mb-lg flex items-start gap-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/50 bg-primary/10 text-primary">
              <Icon name={icon} className="text-[28px]" />
            </span>
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary/85">
                <span className="h-[5px] w-[5px] rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
                {eyebrow}
              </p>
              <h1 className="font-headline-lg text-[32px] leading-tight text-on-surface sm:text-headline-lg">{title}</h1>
              <div className="chalk-underline mt-1" />
              {blurb && <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant">{blurb}</p>}
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

/** A bordered chalk panel. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-outline-variant bg-surface-container-low/70 p-md sm:p-lg ${className}`}>
      {children}
    </section>
  );
}
