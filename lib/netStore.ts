import { createPlayerStore } from "@/lib/createPlayerStore";
import { runNetOperation, type NetOp } from "@/engines/netEngine";
import type { Fault, NetStep } from "@/types/visualization";

export interface NetParams {
  op: NetOp;
  faults: Fault[];
}

export const useNetStore = createPlayerStore<NetStep, NetParams>(
  (p) => runNetOperation(p.op, p.faults),
  { op: "topoFailure", faults: [] },
);
