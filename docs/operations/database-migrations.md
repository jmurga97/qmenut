# Class — Database changes with Drizzle and D1

This is a class, not only a reference. Read it one time from the start. Then keep it
open beside the code when you change the database.

**Who this is for:** any person who must add, change, or remove a table, a column, an
index, a constraint, or catalog data in QMenut.

**What you learn:**

1. Which tool has which job.
2. Where the schema lives.
3. How to make and apply a migration.
4. Which SQLite facts change your Drizzle code.
5. How to apply a migration to production in a safe way.

---

## 1. The tools and their jobs

QMenut keeps five different things apart. Do not mix them.

| Tool          | Job                                                   |
| ------------- | ----------------------------------------------------- |
| SQLite        | The database language and the data model.             |
| Cloudflare D1 | The hosted SQLite database.                           |
| Drizzle ORM   | Typed queries in the application code.                |
| Drizzle Kit   | Compares snapshots and makes the SQL migration files. |
| Wrangler      | Applies the SQL migration files to D1.                |

The flow has one direction only:

```
packages/db/src/schema/*.ts     ← the source of truth (you write this)
        │  bun run --cwd apps/api db:generate -- --name <change_name>
        ▼
apps/api/migrations/NNNN_<name>.sql   + migrations/meta/   ← Drizzle Kit writes this
        │  bun run --cwd apps/api db:migrate:local   (or db:migrate)
        ▼
Cloudflare D1                    ← Wrangler applies the SQL
        │
        ▼
d1_migrations table              ← D1 records the applied filenames
```

**Two rules that you must not break:**

- Drizzle Kit is not the executor. Wrangler is the only executor.
- QMenut has no `__drizzle_migrations` runtime table. D1 keeps the applied list in its
  own `d1_migrations` table. Do not add a Drizzle migrator to the Worker.

---

## 2. The baseline

The first six hand-written migrations are now one squashed file:

- `apps/api/migrations/0000_baseline.sql`
- `apps/api/migrations/meta/0000_snapshot.json`
- `apps/api/migrations/meta/_journal.json`

Drizzle Kit made the DDL from the TypeScript schema. The baseline contains:

- 44 application tables;
- the managed `v_dish_promotion_prices` view;
- foreign keys and their delete actions;
- checks, defaults, and unique constraints;
- composite and single-column primary keys;
- normal indexes and partial indexes.

Only one part of the baseline is manual. It is the immutable catalog data at the end of
the file: 14 allergens and 7 system tags.

Drizzle writes a single-column primary key with an explicit `NOT NULL`. Drizzle can also
write an inline SQLite unique constraint as a named unique index. This is correct. Do not
"repair" these differences by hand.

---

## 3. Where the schema lives

All database objects are declared in `packages/db/src/schema/`. The schema is split by
domain:

| File              | Contents                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.ts`         | `users`, `sessions`, `accounts`, `verifications`                                                                                                          |
| `tenancy.ts`      | `restaurants`, `branches`, `branchPhotos`, `branchSchedules`, `restaurantUsers`, `branchSubscriptions`, `restaurantStripeAccounts`, `restaurantLanguages` |
| `restaurants.ts`  | Re-exports the restaurant tables from `tenancy.ts`                                                                                                        |
| `branches.ts`     | Re-exports the branch tables from `tenancy.ts`                                                                                                            |
| `menu.ts`         | Categories, dishes, variants, ingredients, extras, tags, allergens                                                                                        |
| `translations.ts` | `translations`                                                                                                                                            |
| `promotions.ts`   | `promotions`, `promotionTargets`, and the `vDishPromotionPrices` view                                                                                     |
| `customers.ts`    | `customers`, `customerRestaurants`, `customerVisits`                                                                                                      |
| `loyalty.ts`      | Programs, rewards, transactions, redemptions                                                                                                              |
| `billing.ts`      | `stripeCustomers`                                                                                                                                         |
| `campaigns.ts`    | `campaigns`, `campaignSends`                                                                                                                              |
| `ordering.ts`     | `deliveryZones`, `orders`, `orderItems`, `payments`                                                                                                       |
| `analytics.ts`    | `menuViewDaily`, `dishViewDaily`                                                                                                                          |
| `operations.ts`   | `planChangeLogs`, `internalAlerts`                                                                                                                        |

**The barrel is the contract.** Drizzle Kit reads only
`packages/db/src/schema/index.ts`. If a table is not reachable from that file, Drizzle Kit
does not manage it, and `db:generate` makes no SQL for it.

`tenancy.ts` is an example. The barrel does not export `./tenancy` directly. It exports
`./restaurants` and `./branches`, and those two files re-export the tenancy tables. The
tables are therefore reachable, and Drizzle Kit manages them.

The promotion view must stay declared with `.as(...)`. Do not change it to `.existing()`.
`.existing()` tells Drizzle Kit that another system owns the view, and Drizzle Kit then
stops managing it.

---

## 4. SQLite facts that change your Drizzle code

Learn these before your first change. Each one is a frequent error.

- **A TypeScript union does not make a SQLite `CHECK`.** TypeScript enum metadata stays in
  TypeScript. If the database must refuse a bad value, add an explicit `check(...)`.
- **A relation needs an explicit reference.** Use `.references(...)` for one column, or
  `foreignKey(...)` for more than one column.
- **Tenant relations often use a composite foreign key**, for example
  `(branch_id, restaurant_id)`. This keeps the branch and the restaurant together and
  protects tenant isolation at the database level.
- **A soft-delete index is usually a partial index** with `WHERE deleted_at IS NULL`.
- **A boolean is an integer.** Use Drizzle's boolean integer mode.
- **Money is an integer in minor units (cents).** Never use a float.
- **A time value is an integer in epoch milliseconds.**
- **Some changes need a table rebuild.** SQLite cannot change all columns in place.
  Drizzle Kit then writes a create-copy-drop-rename sequence. Read that SQL with care.
- **D1 migrations go forward only.** There is no down migration. Correct a deployed error
  with a new compensating migration.

---

## 5. Lesson — the normal workflow

Use this workflow for every structural change.

**Step 1 — Change the TypeScript schema.**

Edit the correct file in `packages/db/src/schema/`.

**Step 2 — Export the new object from the barrel.**

Make sure `packages/db/src/schema/index.ts` reaches your new table, directly or through a
re-export file.

**Step 3 — Make the migration.**

```bash
bun run --cwd apps/api db:generate -- --name <snake_case_change_name>
```

**Step 4 — Read the output.**

Read the new `.sql` file. Read the changes in `apps/api/migrations/meta/` also. The
snapshot and the journal must advance together with the SQL.

**Step 5 — Look for damage.**

Look for a destructive table rebuild, a dropped column, a lost index, a lost foreign key,
a lost default, or an error in the data-copy step.

**Step 6 — Validate.**

```bash
bun run --cwd apps/api db:check
```

**Step 7 — Apply to the local database.**

```bash
bun run --cwd apps/api db:migrate:local
```

**Step 8 — Seed and check.**

```bash
bun run --cwd apps/api db:seed:local
```

**Step 9 — Commit the three parts together.**

Commit the TypeScript schema, the generated `.sql`, and the files in `migrations/meta/` in
one commit. A commit that has only two of the three parts breaks `db:check` for all other
persons.

**Step 10 — Apply to production only after the preflight in section 9.**

```bash
bun run --cwd apps/api db:migrate
```

`db:migrate` selects the production Wrangler environment. This is necessary, because a
named Wrangler environment does not inherit the D1 binding.

**An applied migration is immutable.** Do not edit, rename, reorder, or delete a migration
after D1 applied it.

---

## 6. Lesson — custom and data migrations

Use a custom migration only for these four cases:

1. a data backfill;
2. a data transformation;
3. a change to immutable catalog data;
4. DDL that Drizzle Kit cannot make in a safe way.

Make it with this command:

```bash
bun run --cwd apps/api db:generate:custom -- --name <change_name>
```

Do not write a SQL file by hand. The journal and the snapshot must advance with the
migration, and only Drizzle Kit does that.

Before you commit a custom migration, check these points:

- Is the SQL safe if it runs one time only? Do you need it to be idempotent?
- Is the order of the statements correct for the foreign keys?
- What happens to a `NULL` value during a nullability change?
- What do the existing production rows look like?
- Is each statement compatible with D1 and SQLite?
- What is the compensating migration if the change is bad?

---

## 7. Lesson — how the validation works

`bun run --cwd apps/api db:check` does two things:

1. `drizzle-kit check` validates the migration metadata and the snapshot consistency.
2. `apps/api/scripts/check-db-migrations.ts` copies the latest metadata to a temporary
   directory. Then it runs a generation in that directory. If the schema is different from
   the committed snapshot, the journal gets a new entry there, and the script fails.

The script does not change your working tree. It only tells you that a migration is
missing.

The API package runs `db:check` as part of its normal TypeScript check. The root command
therefore finds a missing migration also:

```bash
bun run check
```

---

## 8. Lesson — the local and E2E databases

The E2E reset removes the local D1 state, applies all committed migrations, and runs the
public-menu seed and the E2E seed.

```bash
bun run --cwd e2e reset
```

Other useful commands:

```bash
bun run --cwd apps/api db:migrate:local
bun run --cwd apps/api db:seed:local
bun run --cwd apps/api db:seed:e2e
bun run test:e2e
```

Never set the E2E fixed OTP on a deployed Worker.

---

## 9. Lesson — production

The production database is:

- name `qmenut-db-v2`;
- ID `2bb09db5-d6c8-477c-bf19-040a471ff879`;
- first applied migration `0000_baseline.sql`.

The top-level binding and the `env.production` binding in `apps/api/wrangler.jsonc` both
point to this database.

The previous empty database (`qmenut-db`, `f3138d43-a32e-46f2-a9d9-b4e777b02d8a`) is kept
for rollback. Read [deployment.md](deployment.md) before you change or delete either
database.

**Do these ten steps before and after a production migration:**

1. Run `db:check`.
2. Read the generated SQL again.
3. List the pending migrations:
   ```bash
   bun run --cwd apps/api db:migrations:list
   ```
4. Query the affected production tables. Make sure your assumptions about the existing
   rows are true. Never assume that a table is empty.
5. Keep a safe recovery path.
6. Apply with Wrangler and the production environment:
   ```bash
   bun run --cwd apps/api db:migrate
   ```
7. Check the `d1_migrations` table.
8. Check the changed schema and the changed data directly.
9. Smoke-test `/health`, the login, and one route that reads the database.
10. Make sure that Wrangler reports no pending migrations.

---

## 10. Forbidden

Do not use any of these:

- `drizzle-kit push`;
- `wrangler d1 migrations create`;
- a normal DDL migration file that you name and write by hand;
- a direct schema edit on the production database;
- a manual change to `d1_migrations`;
- a destructive migration without a check of the production data;
- an edit to an applied SQL migration or to its snapshot.

---

## 11. Exercises

Write the TypeScript yourself. Do not copy a finished migration.

**Exercise 1 — an additive column.**
Add a nullable `notes` text column to one branch table. Make the migration. Read the SQL.
Answer: is it an `ALTER TABLE`, or is it a table rebuild? Why?

**Exercise 2 — a constraint.**
Add an explicit `check(...)` that limits a status column to its allowed values. Compare
the generated SQL with exercise 1. SQLite cannot add a check in place, so look for the
rebuild.

**Exercise 3 — a partial index.**
Add a partial index with `WHERE deleted_at IS NULL` on a soft-deletable table. Make sure
that the snapshot records the `where` clause.

**Exercise 4 — a broken barrel.**
Add a new table, but do not export it from `packages/db/src/schema/index.ts`. Run
`db:generate`. See that Drizzle Kit makes nothing. Then add the export and run it again.

**Exercise 5 — a data migration.**
Make a custom migration that fills the new column of exercise 1 for the existing rows.
Write the compensating migration also, but do not commit it.

After each exercise, run `bun run --cwd apps/api db:check` and
`bun run --cwd apps/api db:migrate:local`.

---

## 12. Command reference

| Command                                                      | What it does                              |
| ------------------------------------------------------------ | ----------------------------------------- |
| `bun run --cwd apps/api db:generate -- --name <name>`        | Makes a normal DDL migration.             |
| `bun run --cwd apps/api db:generate:custom -- --name <name>` | Makes an empty custom migration for data. |
| `bun run --cwd apps/api db:check`                            | Validates the metadata and the snapshot.  |
| `bun run --cwd apps/api db:migrate:local`                    | Applies the migrations to local D1.       |
| `bun run --cwd apps/api db:migrate`                          | Applies the migrations to production D1.  |
| `bun run --cwd apps/api db:migrations:list`                  | Lists the pending production migrations.  |
| `bun run --cwd apps/api db:seed:local`                       | Seeds the public-menu rows.               |
| `bun run --cwd apps/api db:seed:e2e`                         | Seeds the E2E rows.                       |
| `bun run --cwd e2e reset`                                    | Rebuilds the full local test state.       |

---

## 13. Key files

| Concern                  | Path                                      |
| ------------------------ | ----------------------------------------- |
| Schema (source of truth) | `packages/db/src/schema/`                 |
| Schema barrel            | `packages/db/src/schema/index.ts`         |
| Drizzle Kit config       | `apps/api/drizzle.config.ts`              |
| Migrations               | `apps/api/migrations/`                    |
| Snapshot and journal     | `apps/api/migrations/meta/`               |
| Validation script        | `apps/api/scripts/check-db-migrations.ts` |
| D1 bindings              | `apps/api/wrangler.jsonc`                 |
| Scripts                  | `apps/api/package.json`                   |
