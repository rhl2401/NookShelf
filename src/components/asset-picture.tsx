"use client";

import { cn } from "@/lib/utils";
import { AssetTypeIcon, PICTURE_CONTAINER_SIZE } from "@/components/asset-type-icon";

export function AssetPicture({
  photoAttachmentId,
  icon,
  color,
  typeIcon,
  typeColor,
  alt,
  size = "md",
  className,
}: {
  photoAttachmentId?: string | null;
  icon?: string | null;
  color?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  alt: string;
  size?: keyof typeof PICTURE_CONTAINER_SIZE;
  className?: string;
}) {
  if (photoAttachmentId) {
    return (
      <div
        className={cn(
          "shrink-0 overflow-hidden bg-muted",
          PICTURE_CONTAINER_SIZE[size],
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/attachments/${photoAttachmentId}`}
          alt={alt}
          className="size-full object-cover"
        />
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
