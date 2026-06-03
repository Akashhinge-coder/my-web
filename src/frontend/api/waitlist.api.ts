import { apiFetch } from "@/frontend/api/http";
import type { Waitlist } from "@/types/domain";
import type { WaitlistPageData } from "@/types/waitlist";

export interface CreateWaitlistBody {
  guest_name: string;
  guest_phone: string;
  party_size: number;
}

export const waitlistApi = {
  getPageData(): Promise<WaitlistPageData> {
    return apiFetch<WaitlistPageData>("/api/v1/waitlist");
  },

  addGuest(body: CreateWaitlistBody): Promise<Waitlist> {
    return apiFetch<Waitlist>("/api/v1/waitlist", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateStatus(id: string, status: Waitlist["status"]): Promise<Waitlist> {
    return apiFetch<Waitlist>(`/api/v1/waitlist/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  notifyGuest(id: string): Promise<Waitlist> {
    return this.updateStatus(id, "notified");
  },

  seatGuest(id: string): Promise<Waitlist> {
    return this.updateStatus(id, "seated");
  },

  markLeft(id: string): Promise<Waitlist> {
    return this.updateStatus(id, "left");
  },
};
