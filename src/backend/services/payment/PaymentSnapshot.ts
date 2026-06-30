export class PaymentSnapshot {
  static readonly SCHEMA_VERSION = 1;

  static generateBillSnapshot(
    restaurant: any,
    table: any,
    orders: any[],
    pricing: any,
    session: any
  ): any {
    return {
      version: this.SCHEMA_VERSION,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        gst_number: restaurant.gst_number,
        cgst_rate: restaurant.cgst_rate,
        sgst_rate: restaurant.sgst_rate,
      },
      table: {
        id: table.id,
        table_number: table.table_number,
      },
      session: {
        id: session.id,
      },
      orders: orders.map(o => ({
        id: o.id,
        items: o.items || [],
        subtotal: o.subtotal,
        taxable_amount: o.taxable_amount,
        gst: o.gst,
        grand_total: o.grand_total,
      })),
      pricing: {
        subtotal: pricing.subtotal,
        taxableAmount: pricing.taxableAmount,
        cgst: pricing.cgst,
        sgst: pricing.sgst,
        gst: pricing.gst,
        totalDiscount: pricing.totalDiscount,
        grandTotal: pricing.grandTotal,
      },
      generated_at: new Date().toISOString(),
    };
  }

  static generateReceiptSnapshot(
    billSnapshot: any,
    paymentMethod: string,
    gatewayTransactionId?: string,
    receiptNumber?: string
  ): any {
    return {
      ...billSnapshot,
      receipt: {
        receipt_number: receiptNumber,
        payment_method: paymentMethod,
        gateway_transaction_id: gatewayTransactionId,
        payment_timestamp: new Date().toISOString(),
      }
    };
  }
}
