import { Scanner } from "@/components/scan/scanner";

export default function ScanPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan</h1>
        <p className="text-sm text-muted-foreground">
          Point your camera at an asset&apos;s QR code to jump straight to it.
        </p>
      </div>
      <Scanner />
    </div>
  );
}
