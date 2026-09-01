"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AssetTypeIcon, PICTURE_CONTAINER_SIZE } from "@/components/asset-type-icon";

export function AssetPicture({
  pictureId,
  icon,
  color,
  typeIcon,
  typeColor,
  alt,
  size = "md",
  className,
}: {
  pictureId?: string | null;
  icon?: string | null;
  color?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  alt: string;
  size?: keyof typeof PICTURE_CONTAINER_SIZE;
  className?: string;
}) {
  if (pictureId) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          PICTURE_CONTAINER_SIZE[size],
          className,
        )}
      >
        {/* Keyed by pictureId so switching pictures mounts a fresh frame — an
            <img> whose src merely changes keeps showing the old bitmap until
            the new one decodes, which reads as "nothing happened". */}
        <PictureFrame key={pictureId} pictureId={pictureId} alt={alt} />
      </div>
    );
  }

  return (
    <AssetTypeIcon
      icon={icon ?? typeIcon ?? null}
      color={icon ? color : typeColor}
      size={size}
      className={className}
    />
  );
}

function PictureFrame({ pictureId, alt }: { pictureId: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/15" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/pictures/${pictureId}`}
        alt={alt}
        className={cn(
          "size-full object-cover transition-opacity duration-150",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  );
}
