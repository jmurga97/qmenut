ALTER TABLE `branches` ADD `latitude` real
  CONSTRAINT `branches_latitude_range`
  CHECK (`latitude` IS NULL OR `latitude` BETWEEN -90 AND 90);--> statement-breakpoint
ALTER TABLE `branches` ADD `longitude` real
  CONSTRAINT `branches_longitude_range`
  CHECK (`longitude` IS NULL OR `longitude` BETWEEN -180 AND 180)
  CONSTRAINT `branches_coordinates_pair`
  CHECK (
    (`latitude` IS NULL AND `longitude` IS NULL)
    OR (`latitude` IS NOT NULL AND `longitude` IS NOT NULL)
  );
