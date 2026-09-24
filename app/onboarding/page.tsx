import type { Metadata } from "next";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { requireUser, safeNext } from "@/lib/session";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Your details — CN_Visualizer" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/onboarding");
  const next = safeNext((await searchParams).next);
  const srm = user.mode === "srm";

  return (
    <AccountShell
      icon="badge"
      eyebrow={srm ? `SRM · ${user.netId}` : "ONE MORE STEP"}
      title="A few details"
      blurb={
        srm
          ? "These put you in the right class so your faculty can see your progress. You only fill this in once."
          : "So we know what to call you. You only fill this in once."
      }
    >
      <Panel>
        <OnboardingForm srm={srm} name={user.name} next={next} initial={user.profile} />
      </Panel>
    </AccountShell>
  );
}
