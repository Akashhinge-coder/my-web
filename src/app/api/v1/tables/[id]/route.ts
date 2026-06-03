import { NextRequest } from "next/server";
import { deleteTable, updateTable } from "@/backend/controllers/table.controller";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateTable(req, params.id);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return deleteTable(params.id);
}
