import { db } from "@/lib/db/client";
import { ocrRateLimits } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

class OcrDailyLimitExceededError extends Error {
  constructor() {
    super("Daily OCR quota exceeded");
    this.name = "OcrDailyLimitExceededError";
  }
}

export interface OcrRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  remainingDay?: number;
  resetSec: number;
  error?: string;
}

/**
 * Resets OCR rate limits for testing or administrative purposes
 */
export async function resetOcrRateLimits(userId?: string): Promise<void> {
  try {
    if (userId) {
      await db.delete(ocrRateLimits).where(eq(ocrRateLimits.userId, userId));
    } else {
      await db.delete(ocrRateLimits);
    }
  } catch (err) {
    console.warn("Failed to reset OCR rate limits in database:", err);
  }
}

/**
 * Atomically checks and increments OCR rate limits across distributed serverless instances.
 * Enforces dual windows:
 * - 5 requests per minute
 * - 25 requests per day
 *
 * Utilizes atomic single-statement PostgreSQL UPSERT with conditional updates to eliminate
 * read-modify-write race conditions under concurrent serverless load.
 */
export async function checkAndConsumeOcrRateLimit(userId: string): Promise<OcrRateLimitResult> {
  const now = new Date();
  const minuteKey = now.toISOString().slice(0, 16); // e.g. "2026-11-19T03:16"
  const dayKey = now.toISOString().slice(0, 10);    // e.g. "2026-11-19"

  const minuteExpiresAt = new Date(now.getTime() + 65 * 1000);
  const dayExpiresAt = new Date(now.getTime() + 25 * 3600 * 1000);

  const secondsIntoMinute = now.getSeconds();
  const minuteResetSec = Math.max(1, 60 - secondsIntoMinute);

  const midnightUtc = new Date(now);
  midnightUtc.setUTCHours(24, 0, 0, 0);
  const dayResetSec = Math.max(1, Math.ceil((midnightUtc.getTime() - now.getTime()) / 1000));

  try {
    return await db.transaction(async (tx) => {
      // 1. Atomic Minute Bucket Check-and-Increment (Limit: 5)
      const minuteId = `ocr_min_${userId}_${minuteKey}`;
      const minuteRows = await tx.execute<{ request_count: number }>(sql`
        INSERT INTO ocr_rate_limits (id, user_id, window_type, window_key, request_count, expires_at)
        VALUES (${minuteId}, ${userId}, 'minute', ${minuteKey}, 1, ${minuteExpiresAt.toISOString()})
        ON CONFLICT (user_id, window_type, window_key)
        DO UPDATE SET request_count = ocr_rate_limits.request_count + 1
        WHERE ocr_rate_limits.request_count < 5
        RETURNING request_count;
      `);

      if (!minuteRows || minuteRows.length === 0) {
        return {
          allowed: false,
          limit: 5,
          remaining: 0,
          resetSec: minuteResetSec,
          error: `OCR request limit exceeded. Maximum 5 requests per minute allowed. Try again in ${minuteResetSec}s.`,
        };
      }

      // 2. Atomic Day Bucket Check-and-Increment (Limit: 25)
      const dayId = `ocr_day_${userId}_${dayKey}`;
      const dayRows = await tx.execute<{ request_count: number }>(sql`
        INSERT INTO ocr_rate_limits (id, user_id, window_type, window_key, request_count, expires_at)
        VALUES (${dayId}, ${userId}, 'day', ${dayKey}, 1, ${dayExpiresAt.toISOString()})
        ON CONFLICT (user_id, window_type, window_key)
        DO UPDATE SET request_count = ocr_rate_limits.request_count + 1
        WHERE ocr_rate_limits.request_count < 25
        RETURNING request_count;
      `);

      if (!dayRows || dayRows.length === 0) {
        // Roll back the minute increment to prevent partial consumption
        throw new OcrDailyLimitExceededError();
      }

      const minuteCount = Number(minuteRows[0].request_count);
      const dayCount = Number(dayRows[0].request_count);

      return {
        allowed: true,
        limit: 5,
        remaining: Math.max(0, 5 - minuteCount),
        remainingDay: Math.max(0, 25 - dayCount),
        resetSec: minuteResetSec,
      };
    });
  } catch (err) {
    if (err instanceof OcrDailyLimitExceededError) {
      return {
        allowed: false,
        limit: 25,
        remaining: 0,
        resetSec: dayResetSec,
        error: `Daily OCR quota exceeded. Maximum 25 requests per day allowed. Resets in ${Math.ceil(dayResetSec / 60)} minutes.`,
      };
    }
    console.error("OCR rate limiter database error:", err);
    throw err;
  }
}

// Export checkOcrRateLimit alias for drop-in compatibility
export const checkOcrRateLimit = checkAndConsumeOcrRateLimit;
