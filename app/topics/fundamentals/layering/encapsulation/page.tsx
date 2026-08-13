import { LayerVisualizerScreen } from "@/components/visualizer/LayerVisualizerScreen";

export default function Page() {
  return (
    <LayerVisualizerScreen
      path="/topics/fundamentals/layering/encapsulation"
      title="Encapsulation"
      blurb="HELLO becomes a segment, a packet, a frame, then bits — and back again."
      operation="encapsulation"
    />
  );
}
