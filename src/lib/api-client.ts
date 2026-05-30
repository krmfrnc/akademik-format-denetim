const API_BASE = "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ success: boolean; data?: T; error?: { message: string; code: string } }> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return { success: true };
  }

  const json = await response.json();
  return json;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const result = await apiFetch<T>(path);
  if (!result.success || result.error) {
    throw new Error(result.error?.message || "Bir hata oluştu");
  }
  return result.data as T;
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const result = await apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.success || result.error) {
    throw new Error(result.error?.message || "Bir hata oluştu");
  }
  return result.data as T;
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
): Promise<T> {
  const result = await apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!result.success || result.error) {
    throw new Error(result.error?.message || "Bir hata oluştu");
  }
  return result.data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const result = await apiFetch(path, { method: "DELETE" });
  if (!result.success || result.error) {
    throw new Error(result.error?.message || "Bir hata oluştu");
  }
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();

    xhr.open("POST", path);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.success) {
            resolve(json.data as T);
          } else {
            reject(new Error(json.error?.message || "Yükleme başarısız"));
          }
        } catch {
          reject(new Error("Sunucu yanıtı işlenemedi"));
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          reject(new Error(json.error?.message || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Ağ hatası oluştu"));
    });

    xhr.send(formData);
  });
}

export function getClientAuthUser(): { id: string; name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("auth_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
