import { runLadderOperation, LADDER_DEFAULTS, type LadderParams } from "@/engines/ladderEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { LadderStep } from "@/types/visualization";

export const useLadderStore = createPlayerStore<LadderStep, LadderParams>(runLadderOperation, LADDER_DEFAULTS);
