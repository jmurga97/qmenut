import type { EnvBindings, RuntimeEnv } from "./env/schema";

export interface ApiBindings {
  Bindings: EnvBindings;
}

export interface RequestContext {
  env: RuntimeEnv;
  rawEnv: EnvBindings;
  request: Request;
}
