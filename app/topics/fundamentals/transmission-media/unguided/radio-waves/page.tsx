import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/unguided/radio-waves"
      title="Radio Waves"
      blurb="Omnidirectional broadcast, ground wave bending, sky wave ionospheric reflection, and space wave penetration."
      operation="unguidedRadio"
    />
  );
}
