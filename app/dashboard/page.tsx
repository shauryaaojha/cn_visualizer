import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { ProgressBoard } from "@/components/account/ProgressBoard";
import { SyncOnView } from "@/components/account/SyncOnView";
import { getProgress } from "@/lib/progressStore";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard — CN_Visualizer" };

function Fact({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant/80">{label}</dt>
      <dd className="break-all font-mono text-[14px] text-on-surface">{value}</dd>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  if (!user.profile) redirect("/onboarding?next=/dashboard");
  const p = user.profile;
  const progress = await getProgress(user._id.toHexString());

  async function leave() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AccountShell
      icon="account_circle"
      eyebrow={user.mode === "srm" ? "SRM ACCOUNT" : "ACCOUNT"}
      title={`Hi, ${user.name.split(" ")[0]}`}
      blurb="Your progress across every unit. It saves as you watch, on any device you sign in on."
      width="max-w-6xl"
    >
      <SyncOnView />
      <ProgressBoard items={progress} />

      <div className="mt-md grid gap-md md:grid-cols-[1fr_16rem]">
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Profile</h2>
            <span className="rounded-full border border-primary/60 px-2 py-0.5 font-label-caps text-[12px] uppercase text-primary">
              {user.mode === "srm" ? "SRM" : "Global"}
            </span>
            {user.role === "faculty" && (
              <span className="rounded-full border border-violet/70 px-2 py-0.5 font-label-caps text-[12px] uppercase text-violet">
                Faculty
              </span>
            )}
          </div>
          <dl className="mt-md grid gap-md sm:grid-cols-2">
            <Fact label="Email" value={user.email} />
            <Fact label="NetID" value={user.netId} />
            <Fact label="Register no." value={p.regNo} />
            <Fact label="Department" value={p.dept} />
            <Fact label="Year · Section" value={p.year ? `${p.year} · ${p.section}` : undefined} />
            <Fact label="Organisation" value={p.org} />
          </dl>
          <Link
            href="/onboarding?next=/dashboard"
            className="mt-md inline-flex items-center gap-1.5 font-sans text-[14px] font-bold text-primary hover:underline"
          >
            <Icon name="draw" className="text-[16px]" />
            Edit details
          </Link>
        </Panel>

        <Panel className="flex flex-col gap-sm">
          <Link
            href="/topics"
            className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 font-sans text-[15px] font-bold text-on-primary hover:bg-primary-fixed"
          >
            <Icon name="school" className="text-[18px]" />
            Go to lessons
          </Link>
          <form action={leave}>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 font-sans text-[15px] font-bold text-on-surface hover:border-coral hover:text-coral">
              <Icon name="logout" className="text-[18px]" />
              Sign out
            </button>
          </form>
        </Panel>
      </div>
    </AccountShell>
  );
}
