import type { Env as HonoPinoEnv } from "hono-pino";

export type AppBindings<EnvBindings, RuntimeEnv> = {
  Bindings: EnvBindings;
  Variables: {
    runtimeEnv: RuntimeEnv;
  };
} & HonoPinoEnv;
