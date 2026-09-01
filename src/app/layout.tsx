import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { getWorkspaceBranding } from "@/lib/actions/workspace-settings";
import { DEFAULT_APP_NAME } from "@/lib/branding-shared";
import { contrastForeground } from "@/lib/color-shared";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getWorkspaceBranding();
  return {
    title: branding.appName ?? DEFAULT_APP_NAME,
    description: "Track and manage assets, locations, kits, and checkouts.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const branding = await getWorkspaceBranding();
  // The app is deliberately monochrome — this is the one accent color, applied
  // by overriding the primary/ring theme tokens app-wide (same in light and
  // dark mode). Inline style wins over the .dark class rule automatically.
  const accentStyle = branding.color
    ? ({
        "--primary": branding.color,
        "--primary-foreground": contrastForeground(branding.color),
        "--ring": branding.color,
      } as React.CSSProperties)
    : undefined;

  return (
    <html lang="en" className="h-full antialiased" style={accentStyle}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={200}>
          {children}
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
