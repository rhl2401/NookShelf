import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Edge-safe base config shared between the full auth.ts (Node runtime, used
// in Route Handlers/Server Components/Actions — talks to Prisma) and the
// lightweight instance used by proxy.ts (Edge runtime, route-guarding only,
// must never import Prisma/Node built-ins).
const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
) {
  providers.push(MicrosoftEntraID);
}

if (
  process.env.AUTH_GENERIC_OIDC_ID &&
  process.env.AUTH_GENERIC_OIDC_SECRET &&
  process.env.AUTH_GENERIC_OIDC_ISSUER
) {
  providers.push({
    id: "generic-oidc",
    name: process.env.AUTH_GENERIC_OIDC_NAME || "Single Sign-On",
    type: "oidc",
    issuer: process.env.AUTH_GENERIC_OIDC_ISSUER,
    clientId: process.env.AUTH_GENERIC_OIDC_ID,
    clientSecret: process.env.AUTH_GENERIC_OIDC_SECRET,
    // Without this, next-auth only sends PKCE on the authorization request,
    // omitting the `state` param entirely — providers that enforce it
    // (e.g. Pocket ID) reject the request with "invalid_state" before it
    // ever reaches our callback.
    checks: ["pkce", "state"],
  });
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
};
