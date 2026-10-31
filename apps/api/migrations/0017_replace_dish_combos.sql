-- Preserve enabled legacy offers as ordinary price variants before removing their fields.
-- Deletes obsolete translation rows after merging their contents. The remote migration
-- wrapper requires --allow-data-loss for this reviewed cleanup (244 production rows).
-- Existing price variants require an explicit choice of which option the offer replaces.
-- Soft-deleted dishes are not shown anywhere, so their offers are dropped instead of converted.
UPDATE dishes SET combo_enabled = 0 WHERE combo_enabled = 1 AND deleted_at IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `__dish_variant_conversion_guard` (
  `valid` integer NOT NULL CHECK (`valid` = 1)
);
--> statement-breakpoint
INSERT INTO `__dish_variant_conversion_guard` (`valid`)
SELECT NOT EXISTS (
  SELECT 1 FROM `dishes` d
  WHERE d.combo_enabled = 1 AND (
    d.combo_price IS NULL OR d.combo_price <= d.price
    OR EXISTS (
      SELECT 1 FROM `dish_variant_groups` g
      JOIN `dish_variant_options` o ON o.group_id = g.id
      WHERE g.dish_id = d.id
      GROUP BY g.id HAVING COUNT(DISTINCT o.price_delta) > 1
    )
  )
);
--> statement-breakpoint
INSERT INTO `dish_variant_groups` (`id`, `dish_id`, `name`, `selection_type`, `is_required`, `min_select`, `max_select`, `position`)
SELECT 'price-format-' || id, id, 'COMBO', 'single', 1, 1, 1,
  COALESCE((SELECT MIN(g.position) - 1 FROM dish_variant_groups g WHERE g.dish_id = dishes.id), 0)
FROM dishes WHERE combo_enabled = 1;
--> statement-breakpoint
INSERT INTO `dish_variant_options` (`id`, `group_id`, `name`, `price_delta`, `position`)
SELECT 'price-individual-' || id, 'price-format-' || id, 'INDIVIDUAL', 0, 0
FROM dishes WHERE combo_enabled = 1
UNION ALL
SELECT 'price-combo-' || id, 'price-format-' || id, 'COMBO', combo_price - price, 1
FROM dishes WHERE combo_enabled = 1;
--> statement-breakpoint
-- These price labels stay identical in every language, so adding variants cannot hide
-- an otherwise complete language while it waits for translations.
INSERT INTO `translation_locks` (`restaurant_id`, `entity_type`, `entity_id`, `field`)
SELECT restaurant_id, 'variant_group', 'price-format-' || id, 'name'
FROM dishes WHERE combo_enabled = 1
UNION ALL
SELECT restaurant_id, 'variant_option', 'price-individual-' || id, 'name'
FROM dishes WHERE combo_enabled = 1
UNION ALL
SELECT restaurant_id, 'variant_option', 'price-combo-' || id, 'name'
FROM dishes WHERE combo_enabled = 1;
--> statement-breakpoint
-- Descriptions are rich-text HTML while offers were plain text, so they are escaped into a
-- paragraph. Languages without a translated offer get the source text, marked as outdated.
UPDATE translations SET
  value = value || (SELECT '<p>COMBO: ' || replace(replace(replace(replace(d.combo_description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), char(10), '<br>') || '</p>' FROM dishes d WHERE d.id = translations.entity_id),
  source_text = NULL,
  updated_at = unixepoch() * 1000
WHERE entity_type = 'dish' AND field = 'description'
  AND entity_id IN (SELECT id FROM dishes WHERE combo_enabled = 1)
  AND NOT EXISTS (
    SELECT 1 FROM translations c
    WHERE c.entity_type = 'dish' AND c.entity_id = translations.entity_id
      AND c.language_code = translations.language_code AND c.field = 'comboDescription'
  );
--> statement-breakpoint
-- Merge translated contents too, retaining manual edits and their source freshness.
INSERT INTO `translations` (`id`, `restaurant_id`, `entity_type`, `entity_id`, `language_code`, `field`, `value`, `source_text`, `is_manual`)
SELECT COALESCE(t.id, 'dish-description-' || c.id), c.restaurant_id, 'dish', c.entity_id, c.language_code, 'description',
  CASE WHEN COALESCE(d.description, '') = '' THEN '' ELSE COALESCE(t.value, '') END || '<p>COMBO: ' || replace(replace(replace(replace(c.value, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), char(10), '<br>') || '</p>',
  CASE WHEN (COALESCE(d.description, '') = '' OR t.source_text = d.description) AND c.source_text = d.combo_description
    THEN COALESCE(d.description, '') || '<p>COMBO: ' || replace(replace(replace(replace(d.combo_description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), char(10), '<br>') || '</p>'
    ELSE NULL END,
  MAX(COALESCE(t.is_manual, 0), c.is_manual)
FROM translations c
JOIN dishes d ON d.id = c.entity_id AND d.restaurant_id = c.restaurant_id AND d.combo_enabled = 1
LEFT JOIN translations t ON t.entity_type = 'dish' AND t.entity_id = c.entity_id
  AND t.restaurant_id = c.restaurant_id AND t.language_code = c.language_code AND t.field = 'description'
WHERE c.entity_type = 'dish' AND c.field = 'comboDescription'
ON CONFLICT (`entity_type`, `entity_id`, `language_code`, `field`) DO UPDATE SET
  value = excluded.value, source_text = excluded.source_text, is_manual = excluded.is_manual,
  updated_at = unixepoch() * 1000;
--> statement-breakpoint
UPDATE dishes SET
  description = COALESCE(description, '') || '<p>COMBO: ' || replace(replace(replace(replace(combo_description, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), char(10), '<br>') || '</p>',
  combo_enabled = 0,
  updated_at = unixepoch() * 1000
WHERE combo_enabled = 1;
--> statement-breakpoint
DELETE FROM translations WHERE entity_type = 'dish' AND field = 'comboDescription';
--> statement-breakpoint
DELETE FROM translation_locks WHERE entity_type = 'dish' AND field = 'comboDescription';
--> statement-breakpoint
DROP TABLE `__dish_variant_conversion_guard`;
--> statement-breakpoint
-- Drizzle's table rebuild would cascade-delete child rows on D1. The fields were
-- added with column-local checks in 0009, so drop the dependent description first.
ALTER TABLE `dishes` DROP COLUMN `combo_description`;
--> statement-breakpoint
ALTER TABLE `dishes` DROP COLUMN `combo_price`;
--> statement-breakpoint
ALTER TABLE `dishes` DROP COLUMN `combo_enabled`;
