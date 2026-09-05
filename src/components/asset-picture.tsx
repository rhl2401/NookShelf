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
  inheritTypeIcon = true,
  alt,
  size = "md",
  className,
}: {
  pictureId?: string | null;
  icon?: string | null;
  color?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  // Whether to fall back to typeIcon/typeColor at all — false when the
  // asset's AssetType has icon inheritance turned off (AssetType.inheritIcon).
  inheritTypeIcon?: boolean;
  alt: string;
  size?: keyof typeof PICTURE_CONTAINER_SIZE;
  className?: string;
}) {
  const effectiveTypeIcon = inheritTypeIcon ? typeIcon : null;
  const effectiveTypeColor = inheritTypeIcon ? typeColor : null;
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
        <PictureFrame key={pictureId} pictureId={pictureId} alt={alt} thumb={size !== "xl"} />
      </div>
    );
  }

  return (
    <AssetTypeIcon
      icon={icon ?? effectiveTypeIcon ?? null}
      color={icon ? color : effectiveTypeColor}
      size={size}
      className={className}
    />
  );
}

function PictureFrame({
  pictureId,
  alt,
  thumb,
}: {
  pictureId: string;
  alt: string;
  thumb: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/15" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/pictures/${pictureId}${thumb ? "?size=thumb" : ""}`}
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
