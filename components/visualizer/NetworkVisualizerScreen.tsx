"use client";

import { useEffect } from "react";
import { NetworkCanvas } from "@/components/visualizer/NetworkCanvas";
import { NetworkSidebar } from "@/components/visualizer/NetworkSidebar";
import { PlayerControls } from "@/components/visualizer/PlayerControls";
import { PlayerNotes } from "@/components/visualizer/PlayerNotes";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";
import type { NetOp } from "@/engines/netEngine";
import { useNetStore } from "@/lib/netStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: NetOp;
}

export function NetworkVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    // Faults reset on navigation: a cut carried across topologies would be a
    // different link entirely.
    useNetStore.getState().run({ op: operation, faults: [] });
  }, [operation]);

  return (
    <VisualizerShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<NetworkSidebar />}
      footer={<PlayerControls use={useNetStore} />}
      canvas={<NetworkCanvas />}
      notes={<PlayerNotes use={useNetStore} />}
    />
  );
}
