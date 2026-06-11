import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { StaffService } from "@/backend/services/staff.service";
import {
  createStaffSchema,
  updateStaffSchema,
} from "@/backend/validations/staff.schema";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

export async function listStaff() {
  try {
    return ok(await StaffService.listMembers());
  } catch (error) {
    return handleError(error);
  }
}

export async function createStaffMember(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = validate(createStaffSchema, body);
    return created(await StaffService.createMember(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateStaffMember(req: NextRequest, staffId: string) {
  try {
    const body = await req.json();
    const dto = validate(updateStaffSchema, body);
    return ok(await StaffService.updateMember(staffId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteStaffMember(staffId: string) {
  try {
    await StaffService.deleteMember(staffId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}

