"use client";

import { useEffect } from "react";
import { LayerCanvas } from "@/components/visualizer/LayerCanvas";
import { LayerSidebar } from "@/components/visualizer/LayerSidebar";
import { PlayerControls } from "@/components/visualizer/PlayerControls";
import { PlayerNotes } from "@/components/visualizer/PlayerNotes";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";
import type { LayerOp } from "@/engines/layerEngine";
import { useLayerStore } from "@/lib/layerStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: LayerOp;
}

export function LayerVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    useLayerStore.getState().run({ op: operation });
  }, [operation]);

  return (
    <VisualizerShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<LayerSidebar />}
      footer={<PlayerControls use={useLayerStore} />}
      canvas={<LayerCanvas />}
      notes={<PlayerNotes use={useLayerStore} />}
    />
  );
}
