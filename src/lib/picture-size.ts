// Pure constants, safe to import from client components. Kept separate from
// image-processing.ts, which pulls in `sharp` (server/Node-only — importing
// it from a client bundle fails to build).

export const PICTURE_SIZE_OPTIONS = [32, 64, 128, 256, 512, 1080] as const;
export const DEFAULT_PICTURE_SIZE = 512;
export const THUMB_SIZE = 64;
