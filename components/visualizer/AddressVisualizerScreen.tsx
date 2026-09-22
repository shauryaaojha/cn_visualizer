"use client";

import { useEffect } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { AddressCanvas } from "@/components/visualizer/AddressCanvas";
import { AddressSidebar } from "@/components/visualizer/AddressSidebar";
import type { AddressOp } from "@/lib/addressStore";
import { useAddressStore } from "@/lib/addressStore";

interface Props {
  path: string;
  title: string;
  blurb: string;
  operation: AddressOp;
}

export function AddressVisualizerScreen({ path, title, blurb, operation }: Props) {
  useEffect(() => {
    useAddressStore.getState().run({ op: operation });
  }, [operation]);

  return (
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      sidebar={<AddressSidebar />}
      canvas={<AddressCanvas />}
      use={useAddressStore}
    />
  );
}
