import CustomerMenuView from "@/frontend/components/customer/CustomerMenuView";

export default function CustomerMenuPreviewPage({
  params,
}: {
  params: { slug: string };
}) {
  return <CustomerMenuView slug={params.slug} tableId="preview" />;
}
