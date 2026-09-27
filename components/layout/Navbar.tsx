import Link from "next/link";
import { SyllabusMenu } from "@/components/layout/SyllabusMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { Icon } from "@/components/ui/Icon";
import { SECTIONS } from "@/data/curriculum";

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-low/85 px-gutter backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-md">
        <span className="font-headline-md text-headline-md font-bold text-primary">&lt;CN/&gt;</span>
        <span className="ml-sm hidden rounded-sm border border-outline-variant px-2 py-1 font-label-caps text-label-caps uppercase text-on-surface-variant sm:inline">
          CN_Visualizer
        </span>
      </Link>

      <div className="hidden items-center gap-1.5 lg:flex">
        {SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/topics/${s.slug}`}
            className={`whitespace-nowrap rounded-md border px-2.5 py-1 font-sans text-[14px] font-bold transition-colors ${
              s.status === "available"
                ? "border-primary/60 text-primary hover:bg-primary hover:text-surface"
                : "border-transparent text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
            }`}
          >
            {s.short}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/practice"
          title="Practice quizzes"
          aria-label="Practice quizzes"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-outline-variant px-2.5 py-1.5 font-sans text-[14px] font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="functions" className="text-[18px]" />
          <span className="hidden sm:inline lg:hidden xl:inline">Practice</span>
        </Link>
        <UserMenu />
        <SyllabusMenu />
      </div>
    </nav>
  );
}
