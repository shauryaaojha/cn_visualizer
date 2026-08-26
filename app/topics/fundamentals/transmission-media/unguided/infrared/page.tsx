import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/unguided/infrared"
      title="Infrared Waves"
      blurb="Short-range optical line-of-sight: cannot penetrate solid opaque walls, guaranteeing room security and zero crosstalk."
      operation="unguidedInfrared"
    />
  );
}
