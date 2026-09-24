import { runJourneyOperation, JOURNEY_DEFAULTS, type JourneyParams } from "@/engines/journeyEngine";
import { createPlayerStore } from "@/lib/createPlayerStore";
import type { JourneyStep } from "@/types/visualization";

export const useJourneyStore = createPlayerStore<JourneyStep, JourneyParams>(runJourneyOperation, JOURNEY_DEFAULTS);
