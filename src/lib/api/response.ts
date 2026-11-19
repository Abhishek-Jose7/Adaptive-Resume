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

  const message = err instanceof Error ? err.message : "An unexpected internal error occurred.";
  return apiError("INTERNAL_ERROR", message, 500, undefined, true);
}
