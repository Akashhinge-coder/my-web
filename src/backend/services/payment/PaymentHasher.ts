import crypto from "crypto";

export class PaymentHasher {
  static hashBillSnapshot(snapshot: any): string {
    const jsonString = JSON.stringify(snapshot);
    return crypto.createHash("sha256").update(jsonString).digest("hex");
  }

  static verifyBillSnapshot(snapshot: any, expectedHash: string): boolean {
    const actualHash = this.hashBillSnapshot(snapshot);
    return actualHash === expectedHash;
  }
}
