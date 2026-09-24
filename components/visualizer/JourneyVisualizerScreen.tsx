"use client";

import { EngineScreen } from "@/components/visualizer/EngineScreen";
import { JourneyCanvas } from "@/components/visualizer/JourneyCanvas";
import { journeyControls, type JourneyOp } from "@/engines/journeyEngine";
import { useJourneyStore } from "@/lib/journeyStore";

export function JourneyVisualizerScreen({ path, title, blurb, operation }: { path: string; title: string; blurb: string; operation: JourneyOp }) {
  return (
    <EngineScreen
      path={path}
      title={title}
      blurb={blurb}
      op={operation}
      store={useJourneyStore}
      canvas={<JourneyCanvas />}
      controls={journeyControls}
      hint="Click any device, link or header field. Glowing fields changed at this hop. Break the network in Setup."
    />
  );
}
