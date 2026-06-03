import KitchenDisplayView from "@/frontend/components/kitchen/KitchenDisplayView";

export default function KitchenPage({
  params,
}: {
  params: { restaurantId: string };
}) {
  return <KitchenDisplayView restaurantId={params.restaurantId} />;
}
