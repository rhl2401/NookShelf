"use client";

export type PictureRef = { id: string; name: string | null };

// Fixed 6-column grid so the row(s) never wrap past 2 lines when given a
// server-capped list of 12 items (2 rows × 6 columns) for exactly this reason.
export function PictureRow({
  label,
  pictures,
  onPick,
  disabled,
}: {
  label: string;
  pictures: PictureRef[];
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  if (pictures.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="grid grid-cols-6 gap-1.5">
        {pictures.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.name ?? undefined}
            onClick={() => onPick(p.id)}
            disabled={disabled}
            className="aspect-square overflow-hidden rounded-lg bg-muted ring-offset-1 ring-offset-background hover:ring-2 hover:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/pictures/${p.id}`} alt={p.name ?? ""} className="size-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
