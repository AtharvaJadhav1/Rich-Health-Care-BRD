export const TOKEN_KEY = "rhc_token";

/** In-memory only — never survives leaving or reloading the site. */
let memoryToken: string | null = null;

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getToken() {
  return memoryToken;
}

export function persistToken(token: string) {
  memoryToken = token;
  clearStoredTokens();
}

export function clearToken() {
  memoryToken = null;
  clearStoredTokens();
}

/** Remove any old saved login from previous app versions. */
export function clearLegacyPersistentToken() {
  clearStoredTokens();
  memoryToken = null;
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
