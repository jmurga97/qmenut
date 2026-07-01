import { z } from "@hono/zod-openapi";

import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, UNAUTHORIZED } from "./status-codes";

import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodType } from "zod";

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    stack: z.string().optional(),
  })
  .openapi("ErrorResponse");

export function createSuccessResponseSchema<DataSchema extends ZodType>(dataSchema: DataSchema) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

export function createErrorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  } as const;
}

export const badRequestResponse = createErrorResponse("Invalid request");
export const unauthorizedResponse = createErrorResponse("Unauthorized");
export const notFoundResponse = createErrorResponse("Resource not found");
export const internalServerErrorResponse = createErrorResponse("Internal server error");

export const defaultErrorResponses = {
  [INTERNAL_SERVER_ERROR]: internalServerErrorResponse,
} as const;

export const validationErrorResponses = {
  [BAD_REQUEST]: badRequestResponse,
  ...defaultErrorResponses,
} as const;

export const validationNotFoundErrorResponses = {
  ...validationErrorResponses,
  [NOT_FOUND]: notFoundResponse,
} as const;

export const protectedValidationErrorResponses = {
  ...validationErrorResponses,
  [UNAUTHORIZED]: unauthorizedResponse,
} as const;

export const protectedValidationNotFoundErrorResponses = {
  ...validationNotFoundErrorResponses,
  [UNAUTHORIZED]: unauthorizedResponse,
} as const;

interface JsonSuccessOptions<Data, Status extends ContentfulStatusCode> {
  data: Data;
  status: Status;
}

export function jsonSuccess<E extends Env, Data, Status extends ContentfulStatusCode>(
  c: Context<E>,
  options: JsonSuccessOptions<Data, Status>,
) {
  return c.json(
    {
      success: true as const,
      data: options.data,
    },
    options.status,
  );
}
