import { NextRequest } from "next/server";
import { createTable, getTablesPage } from "@/backend/controllers/table.controller";

export async function GET() {
  return getTablesPage();
}

export async function POST(req: NextRequest) {
  return createTable(req);
}
