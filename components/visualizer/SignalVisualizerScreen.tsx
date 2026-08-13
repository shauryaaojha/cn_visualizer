"use client";

import { useEffect } from "react";
import { PlayerControls } from "@/components/visualizer/PlayerControls";
import { PlayerNotes } from "@/components/visualizer/PlayerNotes";
import { SignalCanvas } from "@/components/visualizer/SignalCanvas";
import { SignalSidebar } from "@/components/visualizer/SignalSidebar";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";
import type { SignalOp } from "@/engines/signalEngine";
import { useSignalStore } from "@/lib/signalStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: SignalOp;
  defaultFileKB?: number;
}

export function SignalVisualizerScreen({ path, title, blurb, operation, defaultFileKB }: Props) {
  useEffect(() => {
    useSignalStore.getState().run({ op: operation, fileKB: defaultFileKB ?? 10 });
    // defaultFileKB is a page constant; the sidebar owns it after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);

  return (
    <VisualizerShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<SignalSidebar />}
      footer={<PlayerControls use={useSignalStore} />}
      canvas={<SignalCanvas />}
      notes={<PlayerNotes use={useSignalStore} />}
    />
  );
}
