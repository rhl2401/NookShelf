export function AssetLabel({
  name,
  assetTag,
  qrSrc,
}: {
  name: string;
  assetTag: string;
  qrSrc: string;
}) {
  return (
    <div className="flex w-56 flex-col items-center gap-1 rounded-lg border border-dashed p-3 text-center break-inside-avoid">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt={`QR code for ${assetTag}`} className="size-32" />
      <p className="line-clamp-2 text-sm font-medium">{name}</p>
      <p className="font-mono text-xs text-muted-foreground">{assetTag}</p>
    </div>
  );
}
