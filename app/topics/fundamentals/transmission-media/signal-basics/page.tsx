import { MediaVisualizerScreen } from "@/components/visualizer/MediaVisualizerScreen";

export default function Page() {
  return (
    <MediaVisualizerScreen
      path="/topics/fundamentals/transmission-media/signal-basics"
      title="Signal Basics"
      blurb="Digital NRZ-L vs self-clocking Manchester line encoding, and analog carrier modulation."
      operation="signalBasics"
    />
  );
}
