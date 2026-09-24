import "server-only";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import type { AuthMode, Role } from "@/lib/authRules";

// One document per person, keyed by email. Whichever provider they sign in
// with lands on the same record. That is only safe because authRules insists
// every provider proves the email is verified.

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  image?: string;
  mode: AuthMode;
  role: Role;
  /** SRM only: the part of the address before @srmist.edu.in. */
  netId?: string;
  providers: string[];
  profile?: Profile;
  createdAt: Date;
  lastSeenAt: Date;
}

/** What /onboarding asks for. SRM students give all of it; global users only `org`. */
export interface Profile {
  regNo?: string;
  dept?: string;
  year?: number;
  section?: string;
  org?: string;
  completedAt: Date;
}

const users = async () => (await db()).collection<UserDoc>("users");

export async function upsertUser(v: {
  email: string;
  name?: string | null;
  image?: string | null;
  mode: AuthMode;
  role: Role;
  netId?: string;
  provider: string;
}): Promise<UserDoc> {
  const now = new Date();
  const set: Partial<UserDoc> = { role: v.role, lastSeenAt: now };
  if (v.name) set.name = v.name;
  if (v.image) set.image = v.image;
  // Once Google has proven SRM membership the account stays SRM, even on a
  // later visit through the global Google button (which proves the same thing).
  if (v.mode === "srm") {
    set.mode = "srm";
    set.netId = v.netId;
  }
  const doc = await (await users()).findOneAndUpdate(
    { email: v.email },
    {
      $set: set,
      $addToSet: { providers: v.provider },
      $setOnInsert: {
        email: v.email,
        createdAt: now,
        ...(v.mode === "srm" ? {} : { mode: "global" as const }),
        ...(v.name ? {} : { name: v.email.split("@")[0] }),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) throw new Error("user upsert returned nothing");
  return doc;
}

export async function getUser(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return (await users()).findOne({ _id: new ObjectId(id) });
}

export async function saveProfile(id: string, name: string, profile: Omit<Profile, "completedAt">): Promise<void> {
  await (await users()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, profile: { ...profile, completedAt: new Date() } } },
  );
}
