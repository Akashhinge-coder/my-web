import { NextRequest } from "next/server";
import { WorkerRegistry } from "@/backend/workers/registry";
import { handleError } from "@/backend/errors/handler";
import { ok, badRequest, unauthorized } from "@/backend/utils/apiResponse";

export async function POST(req: NextRequest) {
  try {
    // 1. Basic security check (must come from pg_net or authorized scheduler)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // In production, ensure CRON_SECRET is set in .env
      if (process.env.NODE_ENV === "production") {
        return unauthorized("Invalid cron secret");
      } else {
        console.warn("CRON_SECRET validation bypassed in development mode.");
      }
    }

    const body = await req.json().catch(() => ({}));
    const workerName = body.worker;

    if (!workerName) {
      return badRequest("Worker name is required in JSON body (e.g. { \"worker\": \"reservation-expiry\" })");
    }

    const instance = WorkerRegistry.get(workerName);
    if (!instance) {
      return badRequest(`Worker '${workerName}' not found in registry. Available workers: ${WorkerRegistry.getNames().join(", ")}`);
    }

    // 2. Execute the worker payload
    // A robust implementation would log WorkerStarted, execute, then log WorkerFinished/Failed to an audit table here.
    console.log(`[WorkerRunner] Starting worker: ${instance.name}`);
    
    await instance.run(body.payload);
    
    console.log(`[WorkerRunner] Finished worker: ${instance.name}`);

    return ok({ success: true, worker: instance.name });
  } catch (error) {
    return handleError(error);
  }
}
