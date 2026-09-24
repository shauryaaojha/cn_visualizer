"use client";

import { BitCanvas } from "@/components/visualizer/BitCanvas";
import { EngineScreen } from "@/components/visualizer/EngineScreen";
import { BIT_OP_DEFAULTS, bitControls, type BitOp } from "@/engines/bitEngine";
import { useBitStore } from "@/lib/bitStore";

export function BitVisualizerScreen({ path, title, blurb, operation }: { path: string; title: string; blurb: string; operation: BitOp }) {
  return (
    <EngineScreen
      path={path}
      title={title}
      blurb={blurb}
      op={operation}
      store={useBitStore}
      canvas={<BitCanvas />}
      controls={bitControls}
      opDefaults={BIT_OP_DEFAULTS[operation]}
      hint="Click any bit to inspect it. Change the data or the flipped bit in Setup — every step is recomputed."
    />
  );
}
