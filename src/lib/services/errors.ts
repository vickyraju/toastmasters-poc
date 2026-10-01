import type { AppErrorBody, ErrorCode } from "../domain/types";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  ALREADY_HAS_MAIN_ROLE: 409,
  ALREADY_HAS_SUPPORT_ROLE: 409,
  ALREADY_VOTED: 409,
  STALE: 409,
  INVALID_STATE: 409,
  NOT_ELIGIBLE: 422,
  INSIDE_CUTOFF: 422,
  CLOSED: 423,
  INTERNAL: 500,
};

/** Error thrown by every service; same shape the API adapter will produce (schema.md section 8). */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly extra: {
      fields?: Record<string, string>;
      reason?: string;
      required?: number;
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
  toBody(): AppErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        fields: this.extra.fields,
      },
    };
  }
}
