import { runFrameOperation, FRAME_DEFAULTS, type FrameParams } from "@/engines/frameEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { FrameStep } from "@/types/visualization";

export const useFrameStore = createPlayerStore<FrameStep, FrameParams>(runFrameOperation, FRAME_DEFAULTS);
