import CustomerBillView from "@/frontend/components/customer/CustomerBillView";

export default function BillPage({
  params,
}: {
  params: { slug: string; tableId: string };
}) {
  return <CustomerBillView slug={params.slug} tableId={params.tableId} />;
}
