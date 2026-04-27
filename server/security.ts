import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function now() {
  return Date.now();
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function bucketKey(req: Request, scope: string): string {
  return `${scope}:${getClientIp(req)}`;
}

function take(scope: string, req: Request, max: number, windowMs: number) {
  const key = bucketKey(req, scope);
  const current = buckets.get(key);
  const ts = now();

  if (!current || current.resetAt <= ts) {
    const next = { count: 1, resetAt: ts + windowMs };
    buckets.set(key, next);
    return { allowed: true, remaining: Math.max(0, max - 1), resetAt: next.resetAt };
  }

  if (current.count >= max) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: Math.max(0, max - current.count), resetAt: current.resetAt };
}

export function rateLimit(opts?: { scope?: string; max?: number; windowMs?: number }) {
  const scope = opts?.scope ?? "global";
  const max = opts?.max ?? DEFAULT_MAX;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const result = take(scope, req, max, windowMs);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - now()) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "rate_limited",
        hint: `Too many requests for ${scope}. Retry in ${retryAfter}s.`,
      });
    }

    return next();
  };
}

export function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function getRequiredAdminKey(): string | null {
  const key = process.env.ADMIN_KEY?.trim();
  return key ? key : null;
}
