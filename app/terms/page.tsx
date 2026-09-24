import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { CONTACT_URL, Section, UPDATED } from "@/components/account/Prose";

export const metadata: Metadata = { title: "Terms — CN_Visualizer" };

export default function TermsPage() {
  return (
    <AccountShell icon="receipt_long" eyebrow="TERMS" title="Terms of use" blurb={`Last updated ${UPDATED}.`}>
      <Panel>
        <Section title="What this is">
          <p>
            CN_Visualizer is a free, animated course site for Computer Networks, built by students for learning. It is
            provided as-is. We work to keep the lessons correct, but we cannot promise they are free of mistakes. For
            exams, check against your prescribed textbook.
          </p>
        </Section>

        <Section title="Your account">
          <ul>
            <li>Sign in only with your own Google or GitHub account.</li>
            <li>Keep the details you enter, such as register number and section, accurate. Faculty rely on them.</li>
            <li>Do not try to see other students&apos; data, or to interfere with the site or its sign-in.</li>
          </ul>
          <p>We may suspend accounts that break these rules.</p>
        </Section>

        <Section title="Your data">
          <p>
            How we collect and use your data is set out in the{" "}
            <Link href="/privacy" className="text-primary underline">
              privacy policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Availability">
          <p>The site may change, pause or stop at any time, and features may be added or removed.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or problems:{" "}
            <a href={CONTACT_URL} className="text-primary underline" target="_blank" rel="noreferrer">
              open an issue on GitHub
            </a>
            .
          </p>
        </Section>
      </Panel>
    </AccountShell>
  );
}
