const store = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function rateLimitByIP(
  ip: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  return rateLimit(`${endpoint}:${ip}`, maxRequests, windowMs);
}

export function applyRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number = 10,
): Response | null {
  const result = rateLimitByIP(ip, endpoint, maxRequests);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: "Çok fazla istek. Lütfen biraz bekleyin.", code: "RATE_LIMITED" },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
