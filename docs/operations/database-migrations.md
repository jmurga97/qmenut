# Database migrations with Drizzle and D1

This page describes how to add, change, or remove a table, a column, an index, a
constraint, or catalog data in qmenut. Read it once from the start, then keep it open
beside the code when you change the database.

The page covers which tool has which job, where the schema lives, how to generate and
apply a migration, which SQLite behaviors affect your Drizzle code, and how to apply a
migration to production safely.

## Tools and their jobs

qmenut keeps five concerns separate. Do not mix them.

| Tool          | Job                                                       |
| ------------- | --------------------------------------------------------- |
| SQLite        | The database language and the data model.                 |
| Cloudflare D1 | The hosted SQLite database.                               |
| Drizzle ORM   | Typed queries in the application code.                    |
| Drizzle Kit   | Compares snapshots and generates the SQL migration files. |
| Wrangler      | Applies the SQL migration files to D1.                    |

The flow runs in one direction:

```text
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

Two rules follow from this:

- Drizzle Kit is not the executor. Wrangler is the only executor.
- qmenut has no `__drizzle_migrations` runtime table. D1 keeps the applied list in its own
  `d1_migrations` table. Do not add a Drizzle migrator to the Worker.

## The baseline

The first six hand-written migrations were squashed into one file, accompanied by its
metadata:

- `apps/api/migrations/0000_baseline.sql`
- `apps/api/migrations/meta/0000_snapshot.json`
- `apps/api/migrations/meta/_journal.json`

Drizzle Kit generated the DDL from the TypeScript schema. The baseline contains 44
application tables, the managed `v_dish_promotion_prices` view, foreign keys and their
delete actions, checks, defaults, unique constraints, composite and single-column primary
keys, and normal and partial indexes.

Only one part of the baseline is manual: the immutable catalog data at the end of the
file, which is 14 allergens and 7 system tags.

Drizzle writes a single-column primary key with an explicit `NOT NULL`, and it may write
an inline SQLite unique constraint as a named unique index. Both are correct. Do not
correct these differences by hand.

## Where the schema lives

All database objects are declared in `packages/db/src/schema/`, split by domain:

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

The barrel file is the contract. Drizzle Kit reads only
`packages/db/src/schema/index.ts`. If a table is not reachable from that file, Drizzle Kit
does not manage it, and `db:generate` produces no SQL for it.

`tenancy.ts` illustrates this. The barrel does not export `./tenancy` directly. It exports
`./restaurants` and `./branches`, and those two files re-export the tenancy tables. The
tables are therefore reachable, and Drizzle Kit manages them.

The promotion view must stay declared with `.as(...)`. Do not change it to `.existing()`,
which tells Drizzle Kit that another system owns the view and stops it from managing the
view.

## SQLite behaviors that affect your Drizzle code

Read these before your first change. Each one is a common source of errors.

- A TypeScript union does not produce a SQLite `CHECK`. TypeScript enum metadata stays in
  TypeScript. If the database must reject a bad value, add an explicit `check(...)`.
- A relation needs an explicit reference. Use `.references(...)` for one column, or
  `foreignKey(...)` for more than one column.
- Tenant relations often use a composite foreign key, such as
  `(branch_id, restaurant_id)`. This keeps the branch and the restaurant together and
  enforces tenant isolation at the database level.
- A soft-delete index is usually a partial index with `WHERE deleted_at IS NULL`.
- A boolean is an integer. Use Drizzle's boolean integer mode.
- Money is an integer in minor units (cents). Never use a float.
- A time value is an integer in epoch milliseconds.
- Some changes require a table rebuild, because SQLite cannot change every column in
  place. Drizzle Kit then writes a create, copy, drop, and rename sequence. Read that SQL
  carefully.
- D1 migrations go forward only. There is no down migration. Correct a deployed error with
  a new compensating migration.

## The normal workflow

Use this workflow for every structural change.

1. Change the TypeScript schema. Edit the correct file in `packages/db/src/schema/`.
2. Export the new object from the barrel. Make sure `packages/db/src/schema/index.ts`
   reaches your new table, either directly or through a re-export file.
3. Generate the migration:

   ```bash
   bun run --cwd apps/api db:generate -- --name <snake_case_change_name>
   ```

4. Read the output. Read the new `.sql` file and the changes in
   `apps/api/migrations/meta/`. The snapshot and the journal must advance together with
   the SQL.
5. Look for damage: a destructive table rebuild, a dropped column, a lost index, a lost
   foreign key, a lost default, or an error in the data-copy step.
6. Validate the metadata:

   ```bash
   bun run --cwd apps/api db:check
   ```

7. Apply the migration to the local database:

   ```bash
   bun run --cwd apps/api db:migrate:local
   ```

8. Seed and check:

   ```bash
   bun run --cwd apps/api db:seed:local
   ```

9. Commit the three parts together: the TypeScript schema, the generated `.sql` file, and
   the files in `migrations/meta/`. A commit that contains only two of the three breaks
   `db:check` for everyone else.
10. Apply to production, but only after the preflight described in
    [Production migrations](#production-migrations):

    ```bash
    bun run --cwd apps/api db:migrate
    ```

`db:migrate` selects the production Wrangler environment. This is required, because a
named Wrangler environment does not inherit the D1 binding.

An applied migration is immutable. Do not edit, rename, reorder, or delete a migration
after D1 has applied it.

## Custom and data migrations

Use a custom migration only in these four cases:

1. A data backfill.
2. A data transformation.
3. A change to immutable catalog data.
4. DDL that Drizzle Kit cannot generate safely.

Generate it with this command:

```bash
bun run --cwd apps/api db:generate:custom -- --name <change_name>
```

Do not write a SQL file by hand. The journal and the snapshot must advance with the
migration, and only Drizzle Kit does that.

Before you commit a custom migration, answer these questions:

- Is the SQL safe if it runs only once? Does it need to be idempotent?
- Is the statement order correct for the foreign keys?
- What happens to a `NULL` value during a nullability change?
- What do the existing production rows look like?
- Is each statement compatible with D1 and SQLite?
- What is the compensating migration if the change turns out to be wrong?

## How validation works

`bun run --cwd apps/api db:check` does two things:

1. `drizzle-kit check` validates the migration metadata and the snapshot consistency.
2. `apps/api/scripts/check-db-migrations.ts` copies the latest metadata to a temporary
   directory and runs a generation there. If the schema differs from the committed
   snapshot, the journal in that directory gains a new entry and the script fails.

The script does not change your working tree. It only reports that a migration is missing.

The API package runs `db:check` as part of its TypeScript check, so the root command also
detects a missing migration:

```bash
bun run check
```

## Local and end-to-end databases

The end-to-end reset removes the local D1 state, applies all committed migrations, and
runs the public-menu seed and the end-to-end seed:

```bash
bun run --cwd e2e reset
```

Other useful commands:

```bash
bun run --cwd apps/api db:migrate:local
```

```bash
bun run --cwd apps/api db:seed:local
```

```bash
bun run --cwd apps/api db:seed:e2e
```

```bash
bun run test:e2e
```

Never set the end-to-end fixed OTP on a deployed Worker.

## Production migrations

The production database has the name `qmenut-db-v2` and the ID
`2bb09db5-d6c8-477c-bf19-040a471ff879`. Its first applied migration is
`0000_baseline.sql`. The top-level binding and the `env.production` binding in
`apps/api/wrangler.jsonc` both point to it.

The previous, empty database (`qmenut-db`, `f3138d43-a32e-46f2-a9d9-b4e777b02d8a`) is kept
for rollback. Read [Deployment](deployment.md) before you change or delete either
database.

Perform these ten steps around every production migration:

1. Run `db:check`.
2. Read the generated SQL again.
3. List the pending migrations:

   ```bash
   bun run --cwd apps/api db:migrations:list
   ```

4. Query the affected production tables and confirm that your assumptions about the
   existing rows hold. Never assume that a table is empty.
5. Create and record a D1 Time Travel bookmark immediately before applying the migration.
   For a parent table referenced by foreign keys, do not rely on
   `PRAGMA foreign_keys=OFF`: remote D1 migration execution can retain cascade behavior.
   Prefer additive `ALTER TABLE` statements. `db:check` rejects a migration that drops a
   referenced table.
6. Apply the migration with Wrangler and the production environment:

   ```bash
   bun run --cwd apps/api db:migrate
   ```

7. Check the `d1_migrations` table.
8. Check the changed schema and the changed data directly.
9. Smoke-test `/health`, sign-in, and one route that reads the database.
10. Confirm that Wrangler reports no pending migrations.

## Prohibited operations

Do not use any of the following:

- `drizzle-kit push`.
- `wrangler d1 migrations create`.
- A normal DDL migration file that you name and write by hand.
- A direct schema edit on the production database.
- A manual change to `d1_migrations`.
- A destructive migration applied without checking the production data.
- An edit to an applied SQL migration or to its snapshot.

## Practice exercises

Write the TypeScript yourself. Do not copy a finished migration. After each exercise, run
`bun run --cwd apps/api db:check` and `bun run --cwd apps/api db:migrate:local`.

1. An additive column. Add a nullable `notes` text column to one branch table, generate
   the migration, and read the SQL. Decide whether it is an `ALTER TABLE` or a table
   rebuild, and explain why.
2. A constraint. Add an explicit `check(...)` that limits a status column to its allowed
   values. Compare the generated SQL with exercise 1. SQLite cannot add a check in place,
   so look for the rebuild.
3. A partial index. Add a partial index with `WHERE deleted_at IS NULL` on a
   soft-deletable table, and confirm that the snapshot records the `where` clause.
4. A broken barrel. Add a new table but do not export it from
   `packages/db/src/schema/index.ts`. Run `db:generate` and observe that Drizzle Kit
   produces nothing. Then add the export and run it again.
5. A data migration. Write a custom migration that fills the new column from exercise 1
   for the existing rows. Write the compensating migration as well, but do not commit it.

## Command reference

| Command                                                      | Description                                   |
| ------------------------------------------------------------ | --------------------------------------------- |
| `bun run --cwd apps/api db:generate -- --name <name>`        | Generates a normal DDL migration.             |
| `bun run --cwd apps/api db:generate:custom -- --name <name>` | Generates an empty custom migration for data. |
| `bun run --cwd apps/api db:check`                            | Validates the metadata and the snapshot.      |
| `bun run --cwd apps/api db:migrate:local`                    | Applies the migrations to local D1.           |
| `bun run --cwd apps/api db:migrate`                          | Applies the migrations to production D1.      |
| `bun run --cwd apps/api db:migrations:list`                  | Lists the pending production migrations.      |
| `bun run --cwd apps/api db:seed:local`                       | Seeds the public-menu rows.                   |
| `bun run --cwd apps/api db:seed:e2e`                         | Seeds the end-to-end rows.                    |
| `bun run --cwd e2e reset`                                    | Rebuilds the full local test state.           |

## Key files

| Concern                     | Path                                      |
| --------------------------- | ----------------------------------------- |
| Schema, the source of truth | `packages/db/src/schema/`                 |
| Schema barrel               | `packages/db/src/schema/index.ts`         |
| Drizzle Kit configuration   | `apps/api/drizzle.config.ts`              |
| Migrations                  | `apps/api/migrations/`                    |
| Snapshot and journal        | `apps/api/migrations/meta/`               |
| Validation script           | `apps/api/scripts/check-db-migrations.ts` |
| D1 bindings                 | `apps/api/wrangler.jsonc`                 |
| Scripts                     | `apps/api/package.json`                   |
