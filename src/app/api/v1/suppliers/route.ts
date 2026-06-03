import { NextRequest } from "next/server";
import { createSupplier, listSuppliers } from "@/backend/controllers/suppliers.controller";

export async function GET() {
  return listSuppliers();
}

export async function POST(req: NextRequest) {
  return createSupplier(req);
}
