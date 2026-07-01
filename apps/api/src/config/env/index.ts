import { envSchema } from "./schema";

import type { EnvBindings, RuntimeEnv } from "./schema";

export function parseEnv(rawEnv: EnvBindings): RuntimeEnv {
  return envSchema.parse(rawEnv);
}
