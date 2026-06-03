import CustomerOrdersView from "@/frontend/components/customer/CustomerOrdersView";

export default function OrdersPage({
  params,
}: {
  params: { slug: string; tableId: string };
}) {
  return <CustomerOrdersView slug={params.slug} tableId={params.tableId} />;
}
