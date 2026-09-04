import type { NextAuthConfig } from "next-auth";
import type { LoggerInstance } from "@auth/core/types";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const SENSITIVE_KEY = /secret|password|token|authorization|cookie/i;

// JSON.stringify with circular-ref/Error-object safety, redacting any key
// that looks like a credential — this only ever runs against server-side
// log output, never anything sent to the browser.
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (key, val) => {
      if (SENSITIVE_KEY.test(key)) return "[redacted]";
      if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
      if (val && typeof val === "object") {
        if (seen.has(val)) return "[circular]";
        seen.add(val);
      }
      return val;
    },
    2,
  );
}

// Auth.js's built-in logger only prints `error.cause` for a narrow internal
// error shape, so real diagnostic detail (e.g. the OAuth provider's own
// error/error_description on a failed callback) is silently dropped. Log
// everything we have instead — this is the difference between reading a
// provider's own logs to debug a failed sign-in and reading ours.
const authLogger: Partial<LoggerInstance> = {
  error(error) {
    const name = "type" in error && typeof error.type === "string" ? error.type : error.name;
    console.error(`[auth][error] ${name}: ${error.message}`);
    if (error.cause !== undefined) {
      console.error(`[auth][error][cause] ${safeStringify(error.cause)}`);
    }
    if (error.stack) console.error(`[auth][error][stack] ${error.stack}`);
  },
};

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
  logger: authLogger,
};
