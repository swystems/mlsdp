ADD JAR /opt/hive/lib/hive_udfs.jar;
CREATE TEMPORARY FUNCTION declassify AS 'com.example.hive.udf.DeclassifyUDF';
CREATE TEMPORARY FUNCTION noise AS 'com.example.hive.udf.NoiseUDF';

WITH zipped AS (
  SELECT
    xs,
    ys,
    (declassify(xs, 'L1', 'e1/500') - ys) AS diff
  FROM input_data
),
squared AS (
  SELECT
    diff * diff AS diff_sq
  FROM zipped
),
summed AS (
  SELECT
    SUM(diff_sq) AS inner_product
  FROM squared
)
SELECT declassify(CAST(inner_product * 1 / 2 AS int), 'Public', '0') / 1000 AS output FROM summed;

