import { runBitOperation, BIT_DEFAULTS, type BitParams } from "@/engines/bitEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { BitStep } from "@/types/visualization";

export const useBitStore = createPlayerStore<BitStep, BitParams>(runBitOperation, BIT_DEFAULTS);
