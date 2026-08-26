import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/media-comparison"
      title="Master Media Comparison"
      blurb="Multi-axis benchmark matrix & performance radar comparing Bandwidth, Distance, EMI Immunity, Cost, and Security."
      operation="mediaComparison"
    />
  );
}
