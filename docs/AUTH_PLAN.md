# Login, accounts and progress — architecture plan

Status: **Phase 1 built** on branch `feat/auth-phase1` (2026-09-25). Phases 2–5 are still plans.

Phase 1 differs from the plan below in these ways:
- **No `proxy.ts`.** Each account page checks the session itself (`requireUser` in `lib/session.ts`). The Next 16 docs say proxy is only for optimistic checks, so it would have added nothing.
- **No Auth.js Mongo adapter.** Sessions are JWT cookies. `lib/users.ts` upserts the user by email. Email magic links need the adapter, so they wait until SRM Google turns out to be blocked.
- **GitHub emails are checked against GitHub's emails API.** GitHub's profile email can be unverified, and accounts are keyed by email.

## 1. What we found about SRM login

- An SRM address looks like `xx1234@srmist.edu.in`. The part before `@` is the student's **NetID**. The same NetID and email password log into the Student Portal (sp.srmist.edu.in).
- The `srmist.edu.in` mailbox is **Google Workspace (G-Suite)**. SRM's own LMS offers "login with SRMIST G-Suite account".
- SRM publishes **no OAuth/SSO API** for outside apps. The Student Portal, Academia and eVarsity are closed systems.

**Decision:**
- SRM students sign in with **"Sign in with Google", locked to the `srmist.edu.in` domain**.
- We never ask for, see or store an SRM password. Asking for one would be a phishing pattern and against SRM IT policy.
- Google proves the student owns the mailbox. The server re-checks the `hd` (hosted domain) claim in the ID token. The `hd=` URL hint alone can be edited by the user, so it is not enough.

## 2. Two auth modes

| | **SRM mode** | **Global mode** |
|---|---|---|
| Who | SRMIST students and faculty | Anyone else |
| Sign-in | Google OAuth, `hd` must equal `srmist.edu.in` | Google or GitHub OAuth, or email magic link |
| Identity | email, NetID (= local part), name | email, name |
| Extra profile | section, year, department (asked once, on first login) | optional college/org |
| Can join a class | yes: auto-matched to their section | yes: by entering a class code |
| Faculty role | email in the `FACULTY_EMAILS` allowlist | may become a teacher of their own class (by request/flag) |

- Using Google everywhere means **no passwords are stored at all**. This removes hashing, resets and breach risk.
- The earlier "register number + password" idea is dropped in favour of this. The register number (RA…) is still collected on the profile, because faculty sheets use it.

## 3. Architecture change

The site is currently `output: "export"`, a fully static site. Auth needs a server.

1. **Remove `output: "export"`** in `next.config`. The lesson pages stay statically rendered (SSG). Only the `/api/*` routes and `/dashboard` / `/faculty` run as functions. Vercel handles this automatically.
2. **Auth library:** Auth.js (NextAuth v5), with the MongoDB adapter and JWT sessions in httpOnly cookies.
   - Check its Next 16 compatibility first, and read `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
   - Next 16 renames middleware to **`proxy.ts`**.
3. **`proxy.ts`** guards `/dashboard`, `/faculty/*` and `/api/progress|faculty/*`. Lesson pages stay public: people can learn without logging in.
4. **`lib/db.ts`**: a cached `MongoClient` from `process.env.MONGODB_URI`. It is reused across serverless calls.
5. **Env vars (Vercel):**
   - `MONGODB_URI`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
   - `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`
   - `FACULTY_EMAILS`
   - `EMAIL_SERVER` (only if we use magic links)
6. **Offline-first progress:** progress is written to `localStorage` first, then synced to `/api/progress` in batches. The site keeps working logged-out. On first login, local progress is merged into the account.

## 4. Data model (MongoDB)

```
users       { _id, email, name, image, mode: "srm"|"global", netId?, regNo?,
              role: "student"|"faculty"|"admin", sectionId?, createdAt, lastSeenAt }
sections    { _id, code: "CSE-A 2026", name, facultyIds[], joinCode, year, dept }
progress    { userId, lesson (path), status: "seen"|"completed",
              framesSeen, framesTotal, predictAsked, predictRight,
              timeSpentSec, updatedAt }          // unique index {userId, lesson}
attempts    { userId, lesson, questionId, chosen, right, at }   // Predict answers, raw
quizzes     { _id, unit, questions[], sectionId?, openAt?, closeAt? }
quizResults { userId, quizId, score, answers[], at }
events      { userId, type, lesson?, at }  // TTL index 180 days, drives streaks/heatmap
```

The Auth.js adapter adds its own `accounts`, `sessions` and `verification_tokens` collections.

## 5. Recording progress (client side)

- `LessonShell` uses a `useProgress()` hook. It reports:
  - the frame index reached
  - lesson completion (last frame reached, or all Predict gates passed)
- The Predict gate in `createPlayerStore` (`release(answer)`) fires an `attempt` event.
- Events are debounced and sent with `navigator.sendBeacon` when the page hides.

## 6. Pages and APIs

- `/login`: two buttons, **"SRM student / faculty"** (Google, SRM domain only) and **"Everyone else"**.
- `/onboarding`: a first-login form for section, register number and year.
- `/dashboard` (student):
  - progress by unit, as rings for Unit 1–5 and the capstone
  - Predict accuracy
  - streak
  - a "continue where you left off" link
  - weak topics
- `/faculty` (allowlisted):
  - section switcher (each faculty sees only their own sections)
  - class overview heatmap: students × lessons
  - per-student drill-down
  - the most-missed Predict questions
  - **CSV export**
- APIs:
  - `POST /api/progress`
  - `GET /api/me/progress`
  - `GET /api/faculty/sections/:id`
  - `GET /api/faculty/sections/:id/export.csv`
  - `POST /api/sections/join`

## 7. Features we can add

**For students**
1. **Continue learning:** resume the exact lesson and frame.
2. **Practice mode / unit quizzes.** Questions drawn from the Predict bank plus numericals, with the numbers generated by the engines: CRC remainder, subnet ranges, Hamming, delays. Every attempt gets fresh numbers.
3. **Exam prep pack for 21CSC302J.** PYQ-style questions tagged by unit, with a timed mock test.
4. **Weak-topic review.** Spaced repetition over missed Predict questions.
5. **Streaks, XP and badges**, such as "Subnetting master" or "All of Unit 3". Kept light.
6. **Bookmarks and notes** on any frame.
7. **Certificate of completion** (PDF) per unit or the whole course, verifiable with a link.
8. **Leaderboard** within a section. Opt-in, with nicknames allowed.

**For faculty**
1. **Assign lessons** or quizzes to a section with a due date. Students see it on their dashboard.
2. **Class heatmap** and "most-missed questions", to decide what to re-teach tomorrow.
3. **Live class mode.** Faculty drives a lesson, students follow on phones and answer the Predict question live. The faculty sees answer percentages, like a Kahoot built on our diagrams.
4. **CSV/Excel export** in the university's marks format, with register numbers.
5. **Custom questions** added to a section's quiz.

**For admins/global**
1. Classes for other colleges through **join codes**: any teacher can create a class. This is the global mode.
2. Anonymous usage analytics, such as the most-used lessons.

## 8. Build order

| Phase | Scope | Done when |
|---|---|---|
| **1. Server + auth** | drop static export, `lib/db.ts`, Auth.js with SRM-Google and global providers, `proxy.ts`, `/login`, `/onboarding` | An `@srmist.edu.in` Google account logs in as SRM. A gmail.com account is rejected from SRM mode but accepted in global mode. `next build` passes and Vercel deploys. |
| **2. Progress** | `useProgress` hook, `/api/progress`, local→server merge, student `/dashboard` | Finish a lesson and answer Predicts. The dashboard shows it after reload and on another device. |
| **3. Faculty** | allowlist role, sections, heatmap, per-student view, CSV export | A faculty email sees only their section. The CSV opens in Excel with register numbers. |
| **4. Practice** | quiz engine from engine-generated numericals, results page | A unit quiz is scored and stored, and faculty can see the scores. |
| **5. Extras** | assignments, streaks/badges, live class mode, certificates | Each item is picked one at a time. |

## 9. Needed from you before Phase 1

- A **MongoDB Atlas** cluster, with `MONGODB_URI` added to Vercel env vars. Network access must allow `0.0.0.0/0`, because Vercel has dynamic IPs.
- A **Google Cloud OAuth client** (Web):
  - redirect URIs `https://<site>/api/auth/callback/google` and `http://localhost:3100/api/auth/callback/google`
  - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` added to Vercel
- Optional: a **GitHub OAuth app** for global users.
- The **faculty email list**, for `FACULTY_EMAILS`.
- Access to the Vercel project. It belongs to shauryaaojha, so env vars must be set there.

## 10. Risks

- **SRM Google Workspace admins may block third-party OAuth apps.** Some universities restrict "unverified apps". Test early with one real SRM account. The fallback is email magic links sent to `@srmist.edu.in`, which prove the student owns the mailbox the same way.
- **Serverless cold starts plus Mongo connections:** use the cached client, and set `maxPoolSize` small.
- **Privacy:** store only what's needed. Leaderboards are opt-in. Students can export or delete their data.
