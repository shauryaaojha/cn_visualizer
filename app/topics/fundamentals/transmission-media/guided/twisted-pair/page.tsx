import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/guided/twisted-pair"
      title="Twisted Pair Cable (UTP / STP)"
      blurb="Differential signaling noise cancellation: (+V + N) - (-V + N) = 2V. Why twisting eliminates crosstalk."
      operation="guidedTwistedPair"
    />
  );
}
