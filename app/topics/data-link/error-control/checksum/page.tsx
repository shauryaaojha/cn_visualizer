import { BitVisualizerScreen } from "@/components/visualizer/BitVisualizerScreen";

export default function Page() {
  return <BitVisualizerScreen path="/topics/data-link/error-control/checksum" title="Checksum" blurb="Add the words with end-around carry, complement, verify." operation="checksum" />;
}
