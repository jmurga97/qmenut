-- QMenut display-only dish extras

CREATE TABLE ingredients (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    price         INTEGER NOT NULL CHECK (price >= 0),
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted_at    INTEGER
);
CREATE INDEX idx_ingredients_restaurant ON ingredients(restaurant_id, name) WHERE deleted_at IS NULL;

CREATE TABLE dish_extras (
    dish_id       TEXT    NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    ingredient_id TEXT    NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (dish_id, ingredient_id)
);
CREATE INDEX idx_dish_extras_dish ON dish_extras(dish_id, position);
CREATE INDEX idx_dish_extras_ingredient ON dish_extras(ingredient_id);

-- SQLite cannot extend a CHECK enum in place, so rebuild translations to allow
-- ingredient name translations through the existing polymorphic table.
CREATE TABLE translations_new (
    id            TEXT    PRIMARY KEY,
    restaurant_id TEXT    NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    entity_type   TEXT    NOT NULL CHECK (entity_type IN ('dish','category','variant_group','variant_option','ingredient')),
    entity_id     TEXT    NOT NULL,
    language_code TEXT    NOT NULL,
    field         TEXT    NOT NULL,
    value         TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','pending_update')),
    source        TEXT    NOT NULL DEFAULT 'machine' CHECK (source IN ('machine','manual')),
    created_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at    INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    UNIQUE (entity_type, entity_id, language_code, field)
);

INSERT INTO translations_new (
    id,
    restaurant_id,
    entity_type,
    entity_id,
    language_code,
    field,
    value,
    status,
    source,
    created_at,
    updated_at
)
SELECT
    id,
    restaurant_id,
    entity_type,
    entity_id,
    language_code,
    field,
    value,
    status,
    source,
    created_at,
    updated_at
FROM translations;

DROP TABLE translations;
ALTER TABLE translations_new RENAME TO translations;
CREATE INDEX idx_translations_lookup ON translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_pending ON translations(restaurant_id, status);
