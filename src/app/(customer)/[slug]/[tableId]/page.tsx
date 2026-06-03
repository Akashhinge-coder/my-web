import CustomerMenuView from "@/frontend/components/customer/CustomerMenuView";

export default function CustomerMenuPage({
  params,
}: {
  params: { slug: string; tableId: string };
}) {
  return <CustomerMenuView slug={params.slug} tableId={params.tableId} />;
}
