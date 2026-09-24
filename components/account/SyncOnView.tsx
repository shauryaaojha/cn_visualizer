"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { sync } from "@/lib/progressClient";

/**
 * The dashboard is rendered on the server, so it can be a few seconds behind
 * the browser. Push anything unsent, and re-render if the server got something new.
 */
export function SyncOnView() {
  const router = useRouter();
  useEffect(() => {
    void sync().then((changed) => changed && router.refresh());
  }, [router]);
  return null;
}
