import { createPlayerStore } from "@/lib/createPlayerStore";
import { runLayerOperation, type LayerOp } from "@/engines/layerEngine";
import type { LayerStep } from "@/types/visualization";

export interface LayerParams {
  op: LayerOp;
}

export const useLayerStore = createPlayerStore<LayerStep, LayerParams>(
  (p) => runLayerOperation(p.op),
  { op: "encapsulation" },
);
