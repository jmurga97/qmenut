-- Custom SQL migration file, put your code below! --
UPDATE restaurants
SET source_currency = CASE country_code
  WHEN 'VEN' THEN 'USD'
  WHEN 'ESP' THEN 'EUR'
  ELSE source_currency
END;
