import crypto from "crypto";

export class PaymentHasher {
  private static stringifyDeterministic(obj: any): string {
    if (obj === undefined) return "";
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map(item => item === undefined ? "null" : this.stringifyDeterministic(item)).join(",") + "]";
    }
    const keys = Object.keys(obj).sort();
    const props: string[] = [];
    for (const key of keys) {
      if (obj[key] !== undefined) {
        props.push(`${JSON.stringify(key)}:${this.stringifyDeterministic(obj[key])}`);
      }
    }
    return "{" + props.join(",") + "}";
  }

  static hashBillSnapshot(snapshot: any): string {
    const jsonString = this.stringifyDeterministic(snapshot);
    return crypto.createHash("sha256").update(jsonString).digest("hex");
  }

  static verifyBillSnapshot(snapshot: any, expectedHash: string): boolean {
    const actualHash = this.hashBillSnapshot(snapshot);
    return actualHash === expectedHash;
  }

  static hashIdempotencyKey(key: string): string {
    const secret = process.env.PAYMENT_IDEMPOTENCY_SECRET || "default_mock_idempotency_secret_123";
    return crypto.createHmac("sha256", secret).update(key).digest("hex");
  }
}
