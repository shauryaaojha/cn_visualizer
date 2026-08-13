import { createPlayerStore } from "@/lib/createPlayerStore";
import { runNetOperation, type NetOp } from "@/engines/netEngine";
import type { Fault, NetStep } from "@/types/visualization";

export interface NetParams {
  op: NetOp;
  /** Sender and receiver — both chosen by the student. */
  from: string;
  to: string;
  /** How many hosts to wire, 4–8. */
  hosts: number;
  faults: Fault[];
}

export const useNetStore = createPlayerStore<NetStep, NetParams>((p) => runNetOperation(p), {
  op: "topoFailure",
  from: "A",
  to: "E",
  hosts: 6,
  faults: [],
});
