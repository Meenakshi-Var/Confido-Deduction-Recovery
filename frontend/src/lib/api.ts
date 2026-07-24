import { Company, Deduction, DisputeEvent, DisputeStage, RecoverySummary } from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  companies: () => request<Company[]>("/api/companies"),

  deductions: (companyId: number, includeDeleted = false) =>
    request<Deduction[]>(`/api/deductions?companyId=${companyId}&includeDeleted=${includeDeleted}`),

  recoverySummary: (companyId: number) =>
    request<RecoverySummary>(`/api/recovery/summary?companyId=${companyId}`),

  startDispute: (sourceId: string) =>
    request<Deduction>(`/api/deductions/${sourceId}/dispute`, { method: "POST", body: "{}" }),

  transition: (disputeId: number, toStage: DisputeStage, recoveredAmount?: number, note?: string) =>
    request<Deduction>(`/api/disputes/${disputeId}/transition`, {
      method: "PATCH",
      body: JSON.stringify({ toStage, recoveredAmount, note }),
    }),

  reopen: (disputeId: number, reason: string) =>
    request<Deduction>(`/api/disputes/${disputeId}/reopen`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  disputeEvents: (disputeId: number) => request<DisputeEvent[]>(`/api/disputes/${disputeId}/events`),
};
