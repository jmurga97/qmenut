CREATE TRIGGER `branches_google_reviews_connection_insert`
BEFORE INSERT ON `branches`
WHEN NEW.`google_reviews_enabled` = 1 AND NEW.`google_place_id` IS NULL
BEGIN
  SELECT RAISE(ABORT, 'enabled Google reviews require a Place ID');
END;--> statement-breakpoint
CREATE TRIGGER `branches_google_reviews_connection_update`
BEFORE UPDATE OF `google_reviews_enabled`, `google_place_id` ON `branches`
WHEN NEW.`google_reviews_enabled` = 1 AND NEW.`google_place_id` IS NULL
BEGIN
  SELECT RAISE(ABORT, 'enabled Google reviews require a Place ID');
END;
