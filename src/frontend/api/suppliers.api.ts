import { apiFetch } from "@/frontend/api/http";
import type { Supplier } from "@/types/domain";

export interface CreateSupplierBody {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export type UpdateSupplierBody = Partial<CreateSupplierBody>;

export const suppliersApi = {
  list(): Promise<Supplier[]> {
    return apiFetch<Supplier[]>("/api/v1/suppliers");
  },

  create(body: CreateSupplierBody): Promise<Supplier> {
    return apiFetch<Supplier>("/api/v1/suppliers", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(id: string, body: UpdateSupplierBody): Promise<Supplier> {
    return apiFetch<Supplier>(`/api/v1/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete(id: string): Promise<void> {
    return apiFetch<void>(`/api/v1/suppliers/${id}`, {
      method: "DELETE",
    });
  },
};

