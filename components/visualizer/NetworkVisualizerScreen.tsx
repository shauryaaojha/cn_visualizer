"use client";

import { useEffect } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { NetworkCanvas } from "@/components/visualizer/NetworkCanvas";
import { NetworkSidebar } from "@/components/visualizer/NetworkSidebar";
import { suggestedCut, type NetOp } from "@/engines/netEngine";
import { useNetStore } from "@/lib/netStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: NetOp;
}

export function NetworkVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    const { params } = useNetStore.getState();
    // A cut is a link id, and link ids differ per topology — so carrying one
    // across a navigation would sever something arbitrary. Re-derive instead.
    const cut = suggestedCut(operation, params.hosts, params.from, params.to);
    useNetStore.getState().run({
      op: operation,
      faults: cut && operation !== "topoFailure" ? [{ kind: "linkDown", id: cut }] : [],
    });
  }, [operation]);

  return (
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<NetworkSidebar />}
      canvas={<NetworkCanvas />}
      use={useNetStore}
    />
  );
}
