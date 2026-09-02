import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWorkspaceBranding } from "@/lib/actions/workspace-settings";
import { DEFAULT_APP_NAME } from "@/lib/branding-shared";
import { contrastForeground } from "@/lib/color-shared";
import { backgroundShadeStyle, isBackgroundShadeKey } from "@/lib/background-shades";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getWorkspaceBranding();
  return {
    title: branding.appName ?? DEFAULT_APP_NAME,
    description: "Track and manage assets, locations, kits, and checkouts.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [branding, session] = await Promise.all([getWorkspaceBranding(), auth()]);
  const person = session?.user.personId
    ? await prisma.person.findUnique({
        where: { id: session.user.personId },
        select: { backgroundShade: true },
      })
    : null;
  const resolvedShade = isBackgroundShadeKey(person?.backgroundShade)
    ? person.backgroundShade
    : branding.defaultBackgroundShade;

  // The app is deliberately monochrome — this is the one accent color, applied
  // by overriding the primary/ring theme tokens app-wide (same in light and
  // dark mode). Inline style wins over the .dark class rule automatically.
  const accentStyle = branding.color
    ? {
        "--primary": branding.color,
        "--primary-foreground": contrastForeground(branding.color),
        "--ring": branding.color,
      }
    : {};
  const style = { ...accentStyle, ...backgroundShadeStyle(resolvedShade) } as React.CSSProperties;

  return (
    <html lang="en" className="h-full antialiased" style={style}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>
          {children}
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
