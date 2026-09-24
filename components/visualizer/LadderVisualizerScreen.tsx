"use client";

import { EngineScreen } from "@/components/visualizer/EngineScreen";
import { LadderCanvas } from "@/components/visualizer/LadderCanvas";
import { LADDER_OP_DEFAULTS, ladderControls, type LadderOp } from "@/engines/ladderEngine";
import { useLadderStore } from "@/lib/ladderStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: LadderOp;
}

export function LadderVisualizerScreen({ path, title, blurb, operation }: Props) {
  return (
    <EngineScreen
      path={path}
      title={title}
      blurb={blurb}
      op={operation}
      store={useLadderStore}
      canvas={<LadderCanvas />}
      controls={ladderControls}
      opDefaults={LADDER_OP_DEFAULTS[operation]}
      hint="Click any message arrow, participant or window slot to inspect it — messages show the real header values."
    />
  );
}
