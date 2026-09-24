import { BitVisualizerScreen } from "@/components/visualizer/BitVisualizerScreen";

export default function Page() {
  return <BitVisualizerScreen path="/topics/data-link/error-control/hamming-codes" title="Hamming Codes" blurb="Find the flipped bit from the syndrome, and fix it." operation="hamming" />;
}
