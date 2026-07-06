-- =============================================================================
-- QMenut · Migración: 0004_auth_user_linking
-- =============================================================================
-- Better Auth sustituye a Clerk como fuente de identidad:
--   * restaurant_users.clerk_user_id -> user_id con FK real a users(id).
--     Se reconstruye la tabla (SQLite no permite añadir FK con ALTER); los ids
--     se preservan, así que las FKs entrantes (loyalty_redemptions.validated_by,
--     orders.driver_id) siguen siendo válidas.
--   * restaurants.clerk_org_id se elimina (solo lo usaban schema y seed).
-- Los valores clerk_* existentes no corresponden a usuarios de Better Auth;
-- aceptable porque no hay datos reales todavía (local se re-seedea).
-- =============================================================================

PRAGMA defer_foreign_keys = true;

CREATE TABLE restaurant_users_new (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id       TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_code     TEXT    NOT NULL DEFAULT 'staff'
                          CHECK (role_code IN ('owner','admin','staff')),
    is_driver     INTEGER NOT NULL DEFAULT 0,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    UNIQUE (restaurant_id, user_id)
);

INSERT INTO restaurant_users_new (id, restaurant_id, user_id, role_code, is_driver, is_active, created_at, updated_at)
SELECT id, restaurant_id, clerk_user_id, role_code, is_driver, is_active, created_at, updated_at
FROM restaurant_users
WHERE clerk_user_id IN (SELECT id FROM users);

DROP TABLE restaurant_users;
ALTER TABLE restaurant_users_new RENAME TO restaurant_users;
CREATE INDEX idx_restaurant_users_user ON restaurant_users(user_id);

DROP INDEX ux_restaurants_clerk_org;
ALTER TABLE restaurants DROP COLUMN clerk_org_id;
