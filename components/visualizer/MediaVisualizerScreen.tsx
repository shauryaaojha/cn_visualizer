"use client";

import { useEffect } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { MediaCanvas } from "@/components/visualizer/MediaCanvas";
import { MediaSidebar } from "@/components/visualizer/MediaSidebar";
import type { MediaOperationId } from "@/types/visualization";
import { useMediaStore } from "@/lib/mediaStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: MediaOperationId;
}

export function MediaVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    useMediaStore.getState().run({ op: operation });
  }, [operation]);

  return (
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<MediaSidebar />}
      canvas={<MediaCanvas />}
      use={useMediaStore}
      hint="Click any part of the drawing — a bit, a wire, a layer, the ray — to inspect it."
    />
  );
}
