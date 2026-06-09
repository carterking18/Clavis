/**
 * Simple in-memory rate limiter for API routes.
 * Resets per deployment instance — good enough to stop automated abuse
 * without needing Redis. For higher scale, swap the Map for an upstash/redis store.
 *
 * Usage:
 *   const { limited, headers } = rateLimit(request, { limit: 5, windowMs: 60_000 })
 *   if (limited) return Response.json({ error: 'Too many requests' }, { status: 429, headers })
 */

const store = new Map() // ip -> { count, resetAt }

export function rateLimit(request, { limit = 10, windowMs = 60_000 } = {}) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return { limited: false, headers: rateLimitHeaders(1, limit, now + windowMs) }
  }

  entry.count += 1

  if (entry.count > limit) {
    return {
      limited: true,
      headers: rateLimitHeaders(entry.count, limit, entry.resetAt),
    }
  }

  return { limited: false, headers: rateLimitHeaders(entry.count, limit, entry.resetAt) }
}

function rateLimitHeaders(count, limit, resetAt) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - count)),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
  }
}
