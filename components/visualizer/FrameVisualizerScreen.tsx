"use client";

import { EngineScreen } from "@/components/visualizer/EngineScreen";
import { FrameCanvas } from "@/components/visualizer/FrameCanvas";
import { FRAME_OP_DEFAULTS, frameControls, type FrameOp } from "@/engines/frameEngine";
import { useFrameStore } from "@/lib/frameStore";

export function FrameVisualizerScreen({ path, title, blurb, operation }: { path: string; title: string; blurb: string; operation: FrameOp }) {
  return (
    <EngineScreen
      path={path}
      title={title}
      blurb={blurb}
      op={operation}
      store={useFrameStore}
      canvas={<FrameCanvas />}
      controls={frameControls}
      opDefaults={FRAME_OP_DEFAULTS[operation]}
      hint="Click any field to see its size and the value it holds in this run."
    />
  );
}
