-- Rellena coordenadas de las sucursales sin geolocalización con el centro
-- de València, España (Plaça de l'Ajuntament). Idempotente: solo toca filas
-- con latitud y longitud nulas (el CHECK exige el par completo o nada).
UPDATE `branches`
SET `latitude` = 39.4699,
    `longitude` = -0.3763,
    `updated_at` = unixepoch() * 1000
WHERE `deleted_at` IS NULL
  AND `latitude` IS NULL
  AND `longitude` IS NULL;
