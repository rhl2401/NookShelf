"use client";

export function LocationRowActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
