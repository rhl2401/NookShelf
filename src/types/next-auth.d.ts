import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      personId: string | null;
      roles: string[];
      permissions: string[];
      active: boolean;
    } & DefaultSession["user"];
  }
}
