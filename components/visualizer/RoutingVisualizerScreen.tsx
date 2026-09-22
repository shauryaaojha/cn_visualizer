"use client";

import { useEffect } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { RoutingCanvas } from "@/components/visualizer/RoutingCanvas";
import { RoutingSidebar } from "@/components/visualizer/RoutingSidebar";
import type { RoutingOperationId } from "@/types/visualization";
import { useRoutingStore } from "@/lib/routingStore";

interface Props { path: string; title: string; blurb: string; operation: RoutingOperationId }

export function RoutingVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => { useRoutingStore.getState().run({ op: operation }); }, [operation]);
  return <LessonShell path={path} title={title} blurb={blurb} sidebar={<RoutingSidebar />} canvas={<RoutingCanvas />} use={useRoutingStore} />;
}
