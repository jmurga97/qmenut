import { pinoLogger } from "hono-pino";
import pino from "pino";

import { baseEnvSchema } from "../env/base";

function prettyWrite(payload: unknown) {
  if (typeof payload === "string") {
    console.log(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

export function createPinoLogger() {
  return pinoLogger({
    pino: (c) => {
      const env = baseEnvSchema.parse(c.env);

      return pino({
        base: undefined,
        level: env.LOG_LEVEL,
        browser:
          env.NODE_ENV === "production"
            ? undefined
            : {
                asObject: true,
                write: prettyWrite,
              },
      });
    },
  });
}
