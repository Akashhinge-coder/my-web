import { NextRequest } from "next/server";
import { deleteSupplier, updateSupplier } from "@/backend/controllers/suppliers.controller";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateSupplier(req, params.id);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return deleteSupplier(params.id);
}
