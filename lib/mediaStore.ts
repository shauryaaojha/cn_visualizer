import { createPlayerStore } from "@/lib/createPlayerStore";
import { runMediaOperation, MEDIA_DEFAULTS, type MediaRunParams } from "@/engines/mediaEngine";
import type { MediaStep } from "@/types/visualization";

export interface MediaParams extends MediaRunParams {}

export const useMediaStore = createPlayerStore<MediaStep, MediaParams>(
  (p) => runMediaOperation(p),
  { ...MEDIA_DEFAULTS },
);
