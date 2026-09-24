import { BitVisualizerScreen } from "@/components/visualizer/BitVisualizerScreen";

export default function Page() {
  return <BitVisualizerScreen path="/topics/data-link/error-control/parity" title="Parity Check" blurb="One extra bit catches one error — and misses two." operation="parity" />;
}
