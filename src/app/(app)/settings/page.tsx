import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebhookFormDialog } from "@/components/settings/webhook-form-dialog";
import { WebhookRowActions } from "@/components/settings/webhook-row-actions";
import { PictureSizeControl } from "@/components/settings/picture-size-control";
import { BackgroundShadeControl } from "@/components/settings/background-shade-control";
import { BrandingForm } from "@/components/settings/branding-form";
import { WorkspaceBadge } from "@/components/settings/workspace-badge";
import { getDefaultCurrency, currencyLabel } from "@/lib/currency";
import { DataIoCard } from "@/components/settings/data-io-card";
import { getWorkspacePictureSize, getWorkspaceBranding } from "@/lib/actions/workspace-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("settings:manage")) redirect("/dashboard");

  const [webhooks, pictureSize, branding] = await Promise.all([
    prisma.webhookEndpoint.findMany(),
    getWorkspacePictureSize(),
    getWorkspaceBranding(),
  ]);

  const providers = [
    { name: "Google", configured: Boolean(process.env.AUTH_GOOGLE_ID) },
    { name: "Microsoft", configured: Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID) },
    { name: "Generic OIDC", configured: Boolean(process.env.AUTH_GENERIC_OIDC_ID) },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">
          System configuration for the whole workspace. Looking for your own profile picture or
          notification preferences? Open them from your avatar in the top bar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Branding <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BrandingForm
            appName={branding.appName}
            logoUrl={branding.hasLogo ? `/api/branding/logo?v=${branding.updatedAt?.getTime()}` : null}
            icon={branding.icon}
            iconColor={branding.iconColor}
            color={branding.color}
            signInHeadline={branding.signInHeadline}
            signInSubtitle={branding.signInSubtitle}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            OAuth providers <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {providers.map((p) => (
            <div key={p.name} className="flex items-center justify-between">
              <span>{p.name}</span>
              <Badge variant={p.configured ? "default" : "outline"}>
                {p.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            Configured via environment variables — see .env.example.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Email (SMTP) <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Badge variant={process.env.SMTP_HOST ? "default" : "outline"}>
            {process.env.SMTP_HOST ? "Configured" : "Not configured"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Default currency <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Badge variant="outline">{currencyLabel(getDefaultCurrency())}</Badge>
          <p className="pt-2 text-xs text-muted-foreground">
            Purchase prices entered in another currency are converted to this one for
            display. Set via the DEFAULT_CURRENCY environment variable.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Picture size <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PictureSizeControl pictureSize={pictureSize} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Default background <WorkspaceBadge />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BackgroundShadeControl shade={branding.defaultBackgroundShade} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            Webhooks <WorkspaceBadge />
          </CardTitle>
          <WebhookFormDialog />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {webhooks.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-mono">{w.url}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.events.map((e) => (
                    <Badge key={e} variant="outline" className="text-[10px]">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              <WebhookRowActions id={w.id} enabled={w.enabled} />
            </div>
          ))}
          {webhooks.length === 0 && (
            <p className="text-sm text-muted-foreground">No webhooks configured.</p>
          )}
        </CardContent>
      </Card>

      <DataIoCard />
    </div>
  );
}
