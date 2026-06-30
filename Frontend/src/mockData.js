// ============================================================================
// AURA — Analytics API Service
// ============================================================================
// Fetches real-time and aggregated analytics from the Python backend API.
// ============================================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function getUserEmotions(userId, days = 7) {
  const response = await fetch(`${BACKEND_URL}/analytics/user/${userId}/emotions?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch emotions: ${response.statusText}`);
  }
  return response.json();
}

export async function getUserStress(userId, days = 7) {
  const response = await fetch(`${BACKEND_URL}/analytics/user/${userId}/stress?days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stress: ${response.statusText}`);
  }
  return response.json();
}

export async function getSessionStats(userId) {
  const response = await fetch(`${BACKEND_URL}/analytics/user/${userId}/sessions-summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch session stats: ${response.statusText}`);
  }
  return response.json();
}

export async function getWeeklySummary(userId) {
  const response = await fetch(`${BACKEND_URL}/analytics/user/${userId}/weekly-summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weekly summary: ${response.statusText}`);
  }
  return response.json();
}
