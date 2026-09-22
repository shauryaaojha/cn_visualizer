import { AddressVisualizerScreen } from "@/components/visualizer/AddressVisualizerScreen";

export default function Page() {
  return (
    <AddressVisualizerScreen
      path="/topics/addressing/allocation/vlsm"
      title="VLSM"
      blurb="Largest-first carving with no wasted addresses."
      operation="vlsm"
    />
  );
}
