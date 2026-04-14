import { NextResponse } from "next/server";
import { ZodError, type ZodIssue } from "zod";
import {
  InvalidDocumentOrgIdsError,
  QuoteMissingTaxSnapshotError,
  QuoteTaxResolutionError,
} from "@vbt/core";
import { TenantError } from "./tenant";
import { tenantErrorStatus } from "./tenant";
import { RateLimitExceededError } from "./rate-limit";

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details: Array<{ path?: string; message: string }>;
  };
};

/**
 * Explicit HTTP API failure with stable `code` for clients (i18n via `apiErrors.${code}`) and logging.
 * Thrown from route handlers wrapped by `withSaaSHandler` (or caught and mapped manually).
 */
export class ApiHttpError extends Error {
  readonly name = "ApiHttpError";

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Array<{ path?: string; message: string }> = []
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Build a `NextResponse` with the canonical `{ error: { code, message, details } }` body. */
export function jsonApiErrorResponse(
  status: number,
  code: string,
  message: string,
  details: ApiErrorPayload["error"]["details"] = []
): NextResponse<ApiErrorPayload> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/**
 * Zod from `@vbt/core` vs `web` can resolve to different module instances; `instanceof ZodError` then fails
 * and the error was misclassified as a generic 500. Treat Zod-like shapes as validation errors.
 */
function zodIssuesFromUnknown(error: unknown): ZodIssue[] | null {
  if (error instanceof ZodError) return error.issues;
  if (!error || typeof error !== "object") return null;
  const rec = error as Record<string, unknown>;
  if (rec.name !== "ZodError" || !Array.isArray(rec.issues)) return null;
  return rec.issues as ZodIssue[];
}

/**
 * Normalize unknown errors into a consistent API error shape.
 * Handles RateLimitExceededError, TenantError, Zod validation errors, Prisma errors, and generic Error.
 */
export function normalizeApiError(error: unknown): { status: number; payload: ApiErrorPayload } {
  if (error instanceof ApiHttpError) {
    return {
      status: error.status,
      payload: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  if (error instanceof RateLimitExceededError) {
    return {
      status: 429,
      payload: {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: error.message,
          details: [],
        },
      },
    };
  }

  if (error instanceof InvalidDocumentOrgIdsError) {
    return {
      status: 400,
      payload: {
        error: {
          code: "INVALID_DOCUMENT_ORG_IDS",
          message: error.message,
          details: [],
        },
      },
    };
  }

  if (error instanceof QuoteMissingTaxSnapshotError) {
    return {
      status: 422,
      payload: {
        error: {
          code: error.code,
          message: error.message,
          details: error.quoteId ? [{ path: "quoteId", message: error.quoteId }] : [],
        },
      },
    };
  }

  if (error instanceof QuoteTaxResolutionError) {
    return {
      status: 400,
      payload: {
        error: {
          code: error.code,
          message: error.message,
          details: [],
        },
      },
    };
  }

  if (error instanceof TenantError) {
    return {
      status: tenantErrorStatus(error),
      payload: {
        error: {
          code: error.code,
          message: error.message,
          details: [],
        },
      },
    };
  }

  const zodIssues = zodIssuesFromUnknown(error);
  if (zodIssues) {
    return {
      status: 400,
      payload: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: zodIssues.map((issue) => ({
            path: issue.path.join(".") || undefined,
            message: issue.message,
          })),
        },
      },
    };
  }

  // Prisma errors (from @prisma/client)
  const prismaError = error as { code?: string; meta?: unknown; message?: string };
  if (prismaError && typeof prismaError === "object" && "code" in prismaError) {
    const code = prismaError.code as string;
    if (code === "P2021" || code === "P2022") {
      return {
        status: 503,
        payload: {
          error: {
            code: "DB_SCHEMA_OUT_OF_DATE",
            message:
              "The database is missing tables or columns required by this feature. Apply pending Prisma migrations on this environment (for example: pnpm exec prisma migrate deploy).",
            details: [],
          },
        },
      };
    }
    const status = code === "P2002" ? 409 : code === "P2025" ? 404 : 400;
    const apiCode =
      code === "P2002" ? "DB_DUPLICATE_KEY" : code === "P2025" ? "DB_RECORD_NOT_FOUND" : "DB_ERROR";
    const message =
      code === "P2002"
        ? "A record with this value already exists"
        : code === "P2025"
          ? "Record not found"
          : prismaError.message ?? "Database error";
    return {
      status,
      payload: {
        error: {
          code: apiCode,
          message,
          details: [],
        },
      },
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      payload: {
        error: {
          code: "INTERNAL_ERROR",
          message: process.env.NODE_ENV === "production" ? "An error occurred" : error.message,
          details: [],
        },
      },
    };
  }

  return {
    status: 500,
    payload: {
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
        details: [],
      },
    },
  };
}
