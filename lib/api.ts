export const TOKEN_KEY = "rhc_token";
const LEGACY_TOKEN_KEY = "rhc_token";

function cookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Session-only token — cleared when the browser tab/window closes. */
export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) ?? cookieToken();
}

export function persistToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Drop any old persistent login from before session-only auth. */
export function clearLegacyPersistentToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function fieldValue(form: HTMLFormElement, name: string): string {
  const fromData = String(new FormData(form).get(name) ?? "").trim();
  if (fromData) return fromData;
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value.trim();
  }
  return "";
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const token = options.token ?? getToken();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? "Request failed.");
  }
  return data as T;
}

export async function uploadPhoto(file: File): Promise<string> {
  const token = getToken();
  const form = new FormData();
  form.append("photo", file);
  const res = await fetch("/api/member/photo", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? "Photo upload failed.");
  }
  return data.photoUrl as string;
}

export async function downloadCsv(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not export CSV.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
