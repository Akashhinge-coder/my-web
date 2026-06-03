import { getFeedbackRating } from "@/backend/controllers/feedback.controller";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  return getFeedbackRating(params.id);
}
