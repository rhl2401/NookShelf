import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WebhookFormDialog } from "@/components/settings/webhook-form-dialog";
import { WebhookRowActions } from "@/components/settings/webhook-row-actions";
import { EmailPrefToggle } from "@/components/settings/email-pref-toggle";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { PictureSizeControl } from "@/components/settings/picture-size-control";
import { getDefaultCurrency, currencyLabel } from "@/lib/currency";
import { DataIoCard } from "@/components/settings/data-io-card";
import { getWorkspacePictureSize } from "@/lib/actions/workspace-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canManageSettings = session.user.permissions.includes("settings:manage");

  const person = session.user.personId
    ? await prisma.person.findUnique({ where: { id: session.user.personId } })
    : null;

  const webhooks = canManageSettings ? await prisma.webhookEndpoint.findMany() : [];
  const pictureSize = canManageSettings ? await getWorkspacePictureSize() : null;

  const providers = [
    { name: "Google", configured: Boolean(process.env.AUTH_GOOGLE_ID) },
    { name: "Microsoft", configured: Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID) },
    { name: "Generic OIDC", configured: Boolean(process.env.AUTH_GENERIC_OIDC_ID) },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Notification preferences and system configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile picture</CardTitle>
        </CardHeader>
        <CardContent>
          {person ? (
            <AvatarUploader
              personId={person.id}
              name={person.name}
              hasAvatar={Boolean(person.avatarPath)}
              oauthImage={session.user.image}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to set a profile picture.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {person ? (
            <EmailPrefToggle enabled={person.emailNotificationsEnabled} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in to manage your notification preferences.
            </p>
          )}
        </CardContent>
      </Card>

      {canManageSettings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OAuth providers</CardTitle>
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
              <CardTitle className="text-base">Email (SMTP)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Badge variant={process.env.SMTP_HOST ? "default" : "outline"}>
                {process.env.SMTP_HOST ? "Configured" : "Not configured"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default currency</CardTitle>
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
              <CardTitle className="text-base">Picture size</CardTitle>
            </CardHeader>
            <CardContent>
              <PictureSizeControl pictureSize={pictureSize!} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Webhooks</CardTitle>
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
        </>
      )}
    </div>
  );
}
