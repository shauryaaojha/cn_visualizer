"use client";

import { useEffect } from "react";
import { LayerCanvas } from "@/components/visualizer/LayerCanvas";
import { LayerSidebar } from "@/components/visualizer/LayerSidebar";
import { LessonShell } from "@/components/visualizer/LessonShell";
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
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<LayerSidebar />}
      canvas={<LayerCanvas />}
      use={useLayerStore}
      hint="Click any layer or header on the stage to inspect it."
    />
  );
}
