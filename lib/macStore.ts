import { runMacOperation, MAC_DEFAULTS, type MacParams } from "@/engines/macEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { MacStep } from "@/types/visualization";

export const useMacStore = createPlayerStore<MacStep, MacParams>(runMacOperation, MAC_DEFAULTS);
