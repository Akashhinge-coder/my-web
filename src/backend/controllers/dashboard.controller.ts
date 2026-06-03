import { handleError } from "@/backend/errors/handler";
import { DashboardService } from "@/backend/services/dashboard.service";
import { ok } from "@/backend/utils/apiResponse";

export async function getDashboard() {
  try {
    return ok(await DashboardService.getDashboard());
  } catch (error) {
    return handleError(error);
  }
}
