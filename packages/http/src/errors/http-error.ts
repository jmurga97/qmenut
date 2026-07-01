import type { HttpStatusCode } from "../status-codes";

export class HttpError extends Error {
  readonly status: HttpStatusCode;

  constructor(status: HttpStatusCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
