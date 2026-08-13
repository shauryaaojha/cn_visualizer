import { createPlayerStore } from "@/lib/createPlayerStore";
import { runSignalOperation, SIGNAL_DEFAULTS, type SignalOp, type SignalRunParams } from "@/engines/signalEngine";
import type { SignalStep } from "@/types/visualization";

export interface SignalParams extends SignalRunParams {
  op: SignalOp;
}

export const useSignalStore = createPlayerStore<SignalStep, SignalParams>(
  (p) => runSignalOperation(p.op, p),
  { op: "bandwidthVsLatency", ...SIGNAL_DEFAULTS },
);
