import type { Order } from "@/types/domain";

export function OrderTicket({ order }: { order: Order }) {
  return (
    <article className="rounded-lg border border-dark-border p-4">
      <p className="font-mono text-sm font-semibold">{order.order_number}</p>
      <p className="text-xs text-ink-4">{order.status}</p>
    </article>
  );
}
