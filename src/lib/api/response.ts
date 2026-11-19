import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "../auth/clerk";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "CONCURRENCY_CONFLICT"
  | "RATE_LIMITED"
  | "RATE_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "QUOTA_EXHAUSTED"
  | "PROVIDER_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "UNSUPPORTED_FILE"
  | "URL_FETCH_BLOCKED"
  | "JOB_FAILED"
  | "VERSION_IMMUTABLE"
  | "SHARE_EXPIRED"
  | "CONSENT_REQUIRED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId: string;
    retryable: boolean;
  };
}

export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers });
}

export const successResponse = apiSuccess;

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  fieldErrors?: Record<string, string[]>,
  retryable = false
) {
  const requestId = `req_${crypto.randomUUID().slice(0, 12)}`;
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      fieldErrors,
      requestId,
      retryable,
    },
  };
  return NextResponse.json(body, { status });
}

export const errorResponse = apiError;


export function handleApiError(err: unknown) {
  console.error("[API Error Handler]", err);

  if (err instanceof AuthError) {
    return apiError(
      err.code,
      err.message,
      err.code === "UNAUTHENTICATED" ? 401 : 403
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join(".") || "body";
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    }
    return apiError(
      "VALIDATION_ERROR",
      "Request validation failed. Please check field errors.",
      422,
      fieldErrors,
      false
    );
  }

  const networkCodes = new Set(["EAI_AGAIN", "ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "CONNECT_TIMEOUT"]);
  let cause: unknown = err;
  for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth += 1) {
    const errorCode = "code" in cause ? String((cause as { code?: unknown }).code ?? "") : "";
    if (networkCodes.has(errorCode)) {
      return apiError(
        "SERVICE_UNAVAILABLE",
        "We couldn’t reach a service needed for that request. Please try again in a moment.",
        503,
        undefined,
        true,
      );
    }
    cause = "cause" in cause ? (cause as { cause?: unknown }).cause : undefined;
  }

  return apiError(
    "INTERNAL_ERROR",
    "We couldn’t complete that request. Please try again.",
    500,
    undefined,
    true,
  );
}
