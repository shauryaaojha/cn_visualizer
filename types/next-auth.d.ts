import type { DefaultSession } from "next-auth";
import type { AuthMode, Role } from "@/lib/authRules";

// What auth.ts adds to the session: the Mongo user id and the two facts every
// page needs without a database round trip. The JWT side is read with runtime
// checks in auth.ts. @auth/core is nested under next-auth, so its JWT type
// can't be augmented from here.

declare module "next-auth" {
  interface Session {
    user: { id: string; mode: AuthMode; role: Role } & DefaultSession["user"];
  }
  interface User {
    mode?: AuthMode;
    role?: Role;
  }
}
