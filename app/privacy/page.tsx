import type { Metadata } from "next";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { CONTACT_URL, Section, UPDATED } from "@/components/account/Prose";

export const metadata: Metadata = { title: "Privacy — CN_Visualizer" };

export default function PrivacyPage() {
  return (
    <AccountShell icon="verified" eyebrow="PRIVACY" title="Privacy policy" blurb={`Last updated ${UPDATED}.`}>
      <Panel>
        <Section title="The short version">
          <p>
            You can use every lesson without an account. If you sign in, we store who you are and how far you have got,
            so you can pick up where you left off and, if you are in a class, your faculty can see your progress. We do
            not sell data, show ads or track you across other sites.
          </p>
        </Section>

        <Section title="What we collect when you sign in">
          <ul>
            <li>
              <strong>From Google or GitHub:</strong> your name, email address and profile picture. For SRM accounts, the
              NetID is the part of your email before @srmist.edu.in. We never see or store your password.
            </li>
            <li>
              <strong>What you type in:</strong> SRM students give register number, department, year and section. Others
              may give a college or organisation.
            </li>
            <li>
              <strong>Learning progress:</strong> which lessons you open and finish, and your answers to the Predict
              questions inside them.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul>
            <li>To sign you in and keep you signed in, using a secure cookie that lasts up to 30 days.</li>
            <li>To show your own progress on your dashboard.</li>
            <li>
              To show <strong>faculty</strong> the progress of students in the sections they teach, including export to a
              spreadsheet with register numbers, for teaching and assessment.
            </li>
          </ul>
          <p>We use the Google and GitHub data only for signing in and for the uses above.</p>
        </Section>

        <Section title="Who can see it">
          <ul>
            <li>You.</li>
            <li>Faculty assigned to your section, for progress and scores only.</li>
            <li>The people who run the site, when needed to keep it working.</li>
          </ul>
          <p>
            Data is stored in MongoDB Atlas, and the site is hosted on Vercel. Both act only as service providers. We do not
            share your data with anyone else, unless the law requires it.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can edit your details from your dashboard at any time. To get a copy of your data or have your account and
            progress deleted, open a request on{" "}
            <a href={CONTACT_URL} className="text-primary underline" target="_blank" rel="noreferrer">
              the project&apos;s GitHub page
            </a>
            . Deleted data is removed within 30 days.
          </p>
        </Section>

        <Section title="Changes">
          <p>If this policy changes, the date at the top changes with it.</p>
        </Section>
      </Panel>
    </AccountShell>
  );
}
