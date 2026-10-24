const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("bloodbridge_token");
  }
  return null;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "An unexpected server error occurred";
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.message || errorDetail;
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text() as any;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  getMe: () => apiRequest("/auth/me"),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),

  // Dashboard
  getDashboardSummary: (hospitalId?: number | null) =>
    apiRequest(`/dashboard/summary${hospitalId ? `?hospital_id=${hospitalId}` : ""}`),

  // Hospitals
  getHospitals: () => apiRequest("/hospitals"),
  getHospital: (id: number) => apiRequest(`/hospitals/${id}`),

  // Inventory
  getInventory: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
      });
    }
    return apiRequest(`/inventory?${q.toString()}`);
  },
  getUnit: (id: number) => apiRequest(`/inventory/${id}`),
  createUnit: (data: any) => apiRequest("/inventory", { method: "POST", body: JSON.stringify(data) }),
  updateUnit: (id: number, data: any) => apiRequest(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  reserveUnit: (id: number, data: { request_id: number; notes?: string }) =>
    apiRequest(`/inventory/${id}/reserve`, { method: "POST", body: JSON.stringify(data) }),
  issueUnit: (id: number, data: { request_id?: number; patient_ref?: string; notes?: string }) =>
    apiRequest(`/inventory/${id}/issue`, { method: "POST", body: JSON.stringify(data) }),
  discardUnit: (id: number, reason: string) =>
    apiRequest(`/inventory/${id}/discard?reason=${encodeURIComponent(reason)}`, { method: "POST" }),
  getUnitTransactions: (id: number) => apiRequest(`/inventory/${id}/transactions`),

  // Donations
  getDonations: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
      });
    }
    return apiRequest(`/donations?${q.toString()}`);
  },
  createDonation: (data: any, autoCreateUnit: boolean = true) =>
    apiRequest(`/donations?create_blood_unit_automatically=${autoCreateUnit}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDonors: () => apiRequest("/donations/donors"),
  createDonor: (data: any) => apiRequest("/donations/donors", { method: "POST", body: JSON.stringify(data) }),

  // Requests
  getRequests: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
      });
    }
    return apiRequest(`/requests?${q.toString()}`);
  },
  createRequest: (data: any) => apiRequest("/requests", { method: "POST", body: JSON.stringify(data) }),
  approveRequest: (id: number, notes?: string, autoReserve: boolean = true) =>
    apiRequest(`/requests/${id}/approve?auto_reserve_inventory=${autoReserve}`, {
      method: "POST",
      body: JSON.stringify({ staff_notes: notes }),
    }),
  fulfillRequest: (id: number, unitIds: number[], notes?: string) =>
    apiRequest(`/requests/${id}/fulfill`, {
      method: "POST",
      body: JSON.stringify({ unit_ids: unitIds, notes }),
    }),
  checkCompatibility: (donorGroup: string, recipientGroup: string, component: string) =>
    apiRequest(
      `/requests/compatibility-check?donor_group=${encodeURIComponent(donorGroup)}&recipient_group=${encodeURIComponent(
        recipientGroup
      )}&component_type=${encodeURIComponent(component)}`
    ),

  // AI Modules
  getForecasts: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
      });
    }
    return apiRequest(`/ai/forecasts?${q.toString()}`);
  },
  generateForecasts: (data: any) => apiRequest("/ai/forecasts/generate", { method: "POST", body: JSON.stringify(data) }),
  getForecastEvaluations: (bloodGroup?: string, component?: string) => {
    const q = new URLSearchParams();
    if (bloodGroup) q.append("blood_group", bloodGroup);
    if (component) q.append("component_type", component);
    return apiRequest(`/ai/forecasts/evaluation?${q.toString()}`);
  },
  getShortageRisks: (hospitalId?: number | null, severity?: string, refresh: boolean = false) => {
    const q = new URLSearchParams();
    if (hospitalId) q.append("hospital_id", String(hospitalId));
    if (severity) q.append("severity", severity);
    if (refresh) q.append("refresh", "true");
    return apiRequest(`/ai/shortage-risks?${q.toString()}`);
  },
  getExpiryRisks: (hospitalId?: number | null) =>
    apiRequest(`/ai/expiry-risks${hospitalId ? `?hospital_id=${hospitalId}` : ""}`),
  getRedistributionRecommendations: (status?: string) =>
    apiRequest(`/ai/redistribution-recommendations${status ? `?status=${status}` : ""}`),
  generateRedistributionRecommendations: () =>
    apiRequest("/ai/redistribution-recommendations/generate", { method: "POST" }),
  reviewRecommendation: (id: number, action: "approve" | "reject", notes?: string) =>
    apiRequest(`/ai/recommendations/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    }),
  acknowledgeAlert: (id: number, notes?: string) =>
    apiRequest(`/ai/alerts/${id}/acknowledge`, { method: "POST", body: JSON.stringify({ notes }) }),

  // Transfers
  getTransfers: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
      });
    }
    return apiRequest(`/transfers?${q.toString()}`);
  },
  createTransfer: (data: any) => apiRequest("/transfers", { method: "POST", body: JSON.stringify(data) }),
  dispatchTransfer: (id: number) => apiRequest(`/transfers/${id}/dispatch`, { method: "POST" }),
  receiveTransfer: (id: number) => apiRequest(`/transfers/${id}/receive`, { method: "POST" }),

  // Analytics
  getAnalyticsSummary: (hospitalId?: number | null, daysBack: number = 30) =>
    apiRequest(`/analytics/summary?days_back=${daysBack}${hospitalId ? `&hospital_id=${hospitalId}` : ""}`),
  getExportUrl: (type: "inventory" | "donations" | "requests") => `${BASE_URL}/analytics/export/csv?report_type=${type}`,

  // Notifications
  getNotifications: (unreadOnly: boolean = false) =>
    apiRequest(`/notifications?unread_only=${unreadOnly}`),
  markNotificationRead: (id: number) => apiRequest(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => apiRequest("/notifications/read-all", { method: "POST" }),

  // Audit Logs
  getAuditLogs: (resourceType?: string) =>
    apiRequest(`/audit-logs${resourceType ? `?resource_type=${resourceType}` : ""}`),

  // Reset demo
  resetDatabase: () => apiRequest("/admin/reset-database", { method: "POST" }),
};
