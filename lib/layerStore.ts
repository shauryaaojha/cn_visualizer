import { createPlayerStore } from "@/lib/createPlayerStore";
import { runLayerOperation, LAYER_DEFAULTS, type LayerOp, type LayerRunParams } from "@/engines/layerEngine";
import type { LayerStep } from "@/types/visualization";

export interface LayerParams extends LayerRunParams {
  op: LayerOp;
}

export const useLayerStore = createPlayerStore<LayerStep, LayerParams>(
  (p) => runLayerOperation(p.op, p),
  { op: "encapsulation", ...LAYER_DEFAULTS },
);
