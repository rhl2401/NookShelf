import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDevLoginEnabled } from "@/lib/dev-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes, FlaskConical } from "lucide-react";
import { getWorkspaceBranding } from "@/lib/actions/workspace-settings";
import { DEFAULT_APP_NAME, DEFAULT_SIGN_IN_SUBTITLE } from "@/lib/branding-shared";
import { AssetTypeIcon } from "@/components/asset-type-icon";

const PROVIDERS: Array<{ id: string; label: string; enabled: boolean }> = [
  {
    id: "google",
    label: "Continue with Google",
    enabled: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  },
  {
    id: "microsoft-entra-id",
    label: "Continue with Microsoft",
    enabled: Boolean(
      process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
        process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
        process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    ),
  },
  {
    id: "generic-oidc",
    label: `Continue with ${process.env.AUTH_GENERIC_OIDC_NAME || "Single Sign-On"}`,
    enabled: Boolean(
      process.env.AUTH_GENERIC_OIDC_ID &&
        process.env.AUTH_GENERIC_OIDC_SECRET &&
        process.env.AUTH_GENERIC_OIDC_ISSUER,
    ),
  },
];

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;
  const redirectTo = typeof callbackUrl === "string" ? callbackUrl : "/dashboard";
  const enabledProviders = PROVIDERS.filter((p) => p.enabled);
  const devLoginEnabled = isDevLoginEnabled();
  const branding = await getWorkspaceBranding();
  const appName = branding.appName ?? DEFAULT_APP_NAME;
  const headline = branding.signInHeadline ?? appName;
  const subtitle = branding.signInSubtitle ?? DEFAULT_SIGN_IN_SUBTITLE;
  const logoUrl = branding.hasLogo ? `/api/branding/logo?v=${branding.updatedAt?.getTime()}` : null;

  const people = devLoginEnabled
    ? await prisma.person.findMany({
        where: { email: { not: null }, status: { not: "MERGED" } },
        orderBy: { name: "asc" },
        take: 20,
      })
    : [];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} className="max-h-11 max-w-40 object-contain" />
          ) : branding.icon ? (
            <AssetTypeIcon icon={branding.icon} color={branding.iconColor} size="md" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
              <Boxes className="size-6" />
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight">{headline}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3">
          {enabledProviders.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No sign-in providers are configured yet. Set the OAuth environment
              variables (Google, Microsoft, or a generic OIDC provider) and restart
              the app.
            </p>
          )}
          {enabledProviders.map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                await signIn(provider.id, { redirectTo });
              }}
            >
              <Button type="submit" variant="outline" className="w-full" size="lg">
                {provider.label}
              </Button>
            </form>
          ))}
        </div>

        {devLoginEnabled && (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-500">
              <FlaskConical className="size-4" />
              Development sign-in
            </div>
            <p className="text-xs text-muted-foreground">
              Only available because AUTH_DEV_LOGIN=true and this isn&apos;t a production
              build. Bypasses OAuth entirely — never enable this in production.
            </p>

            {people.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {people.map((person) => (
                  <form
                    key={person.id}
                    action={async () => {
                      "use server";
                      await signIn("dev-login", {
                        email: person.email,
                        name: person.name,
                        redirectTo,
                      });
                    }}
                  >
                    <Button type="submit" variant="secondary" size="sm" className="w-full justify-start">
                      Continue as {person.name}{" "}
                      <span className="text-muted-foreground">({person.email})</span>
                    </Button>
                  </form>
                ))}
              </div>
            )}

            <form
              className="flex flex-col gap-2 border-t pt-3"
              action={async (formData: FormData) => {
                "use server";
                const email = String(formData.get("email") ?? "").trim();
                const name = String(formData.get("name") ?? "").trim();
                if (!email) return;
                await signIn("dev-login", { email, name, redirectTo });
              }}
            >
              <Label htmlFor="dev-name" className="text-xs text-muted-foreground">
                New test user
              </Label>
              <Input id="dev-name" name="name" placeholder="Name" className="h-8" />
              <Input id="dev-email" name="email" placeholder="email@dev.local" className="h-8" />
              <Button type="submit" size="sm" variant="outline">
                Continue as new user
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
