import { getTenantContext } from "./get-tenant-context";
import { router, tenantProcedure } from "../../trpc/trpc";

export const adminTenantRouter = router({
  me: tenantProcedure.query(({ ctx }) => getTenantContext({ db: ctx.db, tenant: ctx.tenant })),
});
