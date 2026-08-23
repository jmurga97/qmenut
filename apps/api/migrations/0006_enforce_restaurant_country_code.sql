-- The additive column migration safely initializes every existing restaurant as Spain.
-- This committed development tenant is the sole Venezuelan exception.
UPDATE `restaurants`
SET `country_code` = 'VEN'
WHERE `id` = 'f65caf8d-4b63-4469-822a-af72abf7287a';

-- SQLite cannot add a table-level CHECK after a column exists without rebuilding the
-- referenced restaurants table. These triggers enforce the equivalent alpha-3 shape
-- without risking foreign-key cascades in D1.
CREATE TRIGGER `restaurants_country_code_iso_alpha_3_insert`
BEFORE INSERT ON `restaurants`
FOR EACH ROW
WHEN NEW.`country_code` NOT GLOB '[A-Z][A-Z][A-Z]'
BEGIN
  SELECT RAISE(ABORT, 'restaurants.country_code must contain three uppercase letters');
END;

CREATE TRIGGER `restaurants_country_code_iso_alpha_3_update`
BEFORE UPDATE OF `country_code` ON `restaurants`
FOR EACH ROW
WHEN NEW.`country_code` NOT GLOB '[A-Z][A-Z][A-Z]'
BEGIN
  SELECT RAISE(ABORT, 'restaurants.country_code must contain three uppercase letters');
END;
