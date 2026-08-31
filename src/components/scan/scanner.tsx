"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseScannedAssetTag, assetScanPath } from "@/lib/scan-code";
import { useBarcodeWedgeScanner } from "@/lib/use-barcode-wedge-scanner";
import { ScanLine, Keyboard } from "lucide-react";

function goToScannedText(text: string) {
  window.location.href = assetScanPath(parseScannedAssetTag(text));
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    const videoEl = videoRef.current;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoEl ?? undefined, (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) return;
        cancelled = true;
        controls.stop();
        goToScannedText(result.getText());
      })
      .then((controls) => {
        controlsRef.current = controls;
        // The effect may have already been cleaned up (e.g. the user
        // navigated away) before the camera stream finished opening.
        if (cancelled) controls.stop();
      })
      .catch(() => setError("Couldn't access the camera. You can still enter a code manually below."));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      // Belt and suspenders: force-release the camera directly too, in case
      // zxing's own controls were never captured (cleanup running before the
      // stream was ready). Without this the camera indicator can stay on
      // after navigating away from this page.
      const stream = videoEl?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  // A hardware barcode scanner set to "keyboard wedge" mode types the code
  // and hits Enter, regardless of what's focused — works the moment this
  // page is open, no camera needed.
  useBarcodeWedgeScanner((code) => {
    setManualCode("");
    goToScannedText(code);
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      </div>
      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      <form
        className="flex w-full max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manualCode.trim()) goToScannedText(manualCode.trim());
        }}
      >
        <Input
          placeholder="Or enter asset ID manually"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
        />
        <Button type="submit" variant="outline">
          <ScanLine className="size-4" /> Go
        </Button>
      </form>

      <p className="flex max-w-sm items-center gap-1.5 text-center text-xs text-muted-foreground">
        <Keyboard className="size-3.5 shrink-0" />
        A USB/Bluetooth barcode scanner also works here — just scan, no need to click into a
        field first.
      </p>
    </div>
  );
}
