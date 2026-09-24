"use client";

import { EngineScreen } from "@/components/visualizer/EngineScreen";
import { MacCanvas } from "@/components/visualizer/MacCanvas";
import { MAC_OP_DEFAULTS, macControls, type MacOp } from "@/engines/macEngine";
import { useMacStore } from "@/lib/macStore";

export function MacVisualizerScreen({ path, title, blurb, operation }: { path: string; title: string; blurb: string; operation: MacOp }) {
  return (
    <EngineScreen
      path={path}
      title={title}
      blurb={blurb}
      op={operation}
      store={useMacStore}
      canvas={<MacCanvas />}
      controls={macControls}
      opDefaults={MAC_OP_DEFAULTS[operation]}
      hint="Click any bar on the time chart, or a station, to inspect it. Pink bars collided."
    />
  );
}
