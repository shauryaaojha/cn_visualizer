import { RoutingVisualizerScreen } from "@/components/visualizer/RoutingVisualizerScreen";

export default function Page() {
  return <RoutingVisualizerScreen path="/topics/routing/forwarding/ip-forwarding" title="IP Forwarding" blurb="One packet, one longest-prefix lookup, one router at a time." operation="ipForwarding" />;
}
