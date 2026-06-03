import { calculateTax } from "@/backend/services/pricing.service";
export { generateInvoiceNumber } from "@/lib/utils";

export function calculateGST(subtotal: number, cgstRate = 2.5, sgstRate = 2.5) {
  const tax = calculateTax(subtotal, { cgstRate, sgstRate });

  return {
    subtotal: tax.taxableAmount,
    cgst: tax.cgst,
    sgst: tax.sgst,
    total: Math.round((tax.taxableAmount + tax.gst + Number.EPSILON) * 100) / 100,
  };
}
