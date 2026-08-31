import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { ensurePersonForUser } from "@/lib/person-bootstrap";
import { isDevLoginEnabled, findOrCreateDevUser } from "@/lib/dev-login";

const devLoginProvider = Credentials({
  id: "dev-login",
  name: "Development login",
  credentials: {
    email: { label: "Email" },
    name: { label: "Name" },
  },
  async authorize(credentials) {
    if (!isDevLoginEnabled()) return null; // re-checked here in case env changed at runtime

    const email = String(credentials?.email ?? "").trim();
    if (!email) return null;
    const name = String(credentials?.name ?? "").trim();

    const user = await findOrCreateDevUser(email, name || email);
    return { id: user.id, email: user.email, name: user.name };
  },
});

// Full config — Node runtime only (Route Handlers, Server Components,
// Server Actions). Never import this from proxy.ts/middleware: it pulls in
// Prisma, which cannot run on the Edge runtime. proxy.ts uses auth.config.ts
// directly for lightweight, DB-free route guarding instead.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [...authConfig.providers, ...(isDevLoginEnabled() ? [devLoginProvider] : [])],
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await ensurePersonForUser({ id: user.id, email: user.email ?? null, name: user.name ?? null });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      const userId = token.sub;
      if (!userId) return session;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { person: { include: { roles: { include: { role: true } } } } },
      });

      const permissions = new Set<string>();
      const roleNames: string[] = [];
      for (const assignment of user?.person?.roles ?? []) {
        roleNames.push(assignment.role.name);
        for (const p of assignment.role.permissions) permissions.add(p);
      }

      session.user.id = userId;
      session.user.name = user?.name ?? session.user.name;
      session.user.email = user?.email ?? session.user.email;
      session.user.image = user?.image ?? session.user.image;
      session.user.personId = user?.person?.id ?? null;
      session.user.roles = roleNames;
      session.user.permissions = Array.from(permissions);
      session.user.active = user?.active ?? true;

      return session;
    },
  },
});
