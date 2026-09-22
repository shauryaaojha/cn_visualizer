import { RoutingVisualizerScreen } from "@/components/visualizer/RoutingVisualizerScreen";

export default function Page() {
  return <RoutingVisualizerScreen path="/topics/routing/algorithms/distance-vector" title="Distance Vector" blurb="Routers trade only their distances, then slowly discover the shortest paths." operation="distanceVector" />;
}
