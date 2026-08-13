"use client";

import { useEffect } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { SignalCanvas } from "@/components/visualizer/SignalCanvas";
import { SignalSidebar } from "@/components/visualizer/SignalSidebar";
import type { SignalOp } from "@/engines/signalEngine";
import { useSignalStore } from "@/lib/signalStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: SignalOp;
}

export function SignalVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    useSignalStore.getState().run({ op: operation });
  }, [operation]);

  return (
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<SignalSidebar />}
      canvas={<SignalCanvas />}
      use={useSignalStore}
    />
  );
}
