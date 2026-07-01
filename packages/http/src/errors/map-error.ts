import { ZodError } from "zod";

import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../status-codes";
import { formatValidationMessage } from "../validation";
import { HttpError, isHttpError } from "./http-error";

export function toHttpError(error: unknown, fallbackMessage = "Internal server error"): HttpError {
  if (isHttpError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new HttpError(BAD_REQUEST, formatValidationMessage(error));
  }

  return new HttpError(INTERNAL_SERVER_ERROR, fallbackMessage);
}
