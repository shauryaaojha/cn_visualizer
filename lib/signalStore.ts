import { createPlayerStore } from "@/lib/createPlayerStore";
import { runSignalOperation, type SignalOp } from "@/engines/signalEngine";
import type { SignalStep } from "@/types/visualization";

export interface SignalParams {
  op: SignalOp;
  fileKB: number;
}

export const useSignalStore = createPlayerStore<SignalStep, SignalParams>(
  (p) => runSignalOperation(p.op, { fileKB: p.fileKB }),
  { op: "bandwidthVsLatency", fileKB: 10 },
);
