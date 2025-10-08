ADD JAR /opt/hive/lib/hive_udfs.jar;
CREATE TEMPORARY FUNCTION declassify AS 'com.example.hive.udf.DeclassifyUDF';
CREATE TEMPORARY FUNCTION noise AS 'com.example.hive.udf.NoiseUDF';

WITH zipped AS (
  SELECT
    xs,
    declassify(ys, 'L2', 'e1') AS ys_declassified
  FROM input_data
),
products AS (
  SELECT
    xs * ys_declassified AS product
  FROM zipped
),
summed AS (
  SELECT
    SUM(product) AS sum_result
  FROM products
)
SELECT declassify(CAST(sum_result AS int), 'Public', '0') AS inner_product
FROM summed;
