const BASE_URL =
  process.env.NEXT_PUBLIC_ENTERPRISE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Enterprise API error");
  }
  return data;
}

export function fetchDashboard(role) {
  return request(`/api/enterprise/dashboards/${role}/`);
}

export function fetchNotifications() {
  return request("/api/enterprise/notifications/");
}

export function markNotificationRead(id) {
  return request(`/api/enterprise/notifications/${id}/read/`, { method: "POST" });
}

export function fetchActivityLogs() {
  return request("/api/enterprise/activity/");
}

export function fetchAnalyticsHistory() {
  return request("/api/enterprise/analytics/history/");
}

export function fetchDwhSummary() {
  return request("/api/enterprise/dwh/summary/");
}

export function searchEnterprise(query) {
  return request(`/api/enterprise/search/?q=${encodeURIComponent(query)}`);
}

export function fetchUsers() {
  return request("/api/enterprise/admin/users/");
}

export function updateUserRole(id, role) {
  return request(`/api/enterprise/admin/users/${id}/role/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function updateProfile(payload) {
  return request("/api/enterprise/users/me/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function exportExcel() {
  return `${BASE_URL}/api/enterprise/exports/excel/`;
}

export function exportPdf() {
  return `${BASE_URL}/api/enterprise/exports/pdf/`;
}

export function fetchProvidersMap(limit = 800) {
  return request(`/api/enterprise/providers/map/?limit=${encodeURIComponent(limit)}`);
}

export function enrollFace(payload) {
  return request("/api/enterprise/face/enroll/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function verifyFace(payload) {
  return request("/api/enterprise/face/verify/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
