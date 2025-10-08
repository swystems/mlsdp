ADD JAR /opt/hive/lib/hive_udfs.jar;
CREATE TEMPORARY FUNCTION declassify AS 'com.example.hive.udf.DeclassifyUDF';
CREATE TEMPORARY FUNCTION noise AS 'com.example.hive.udf.NoiseUDF';

WITH computed AS (
  SELECT declassify(secret_value, 'L2', 'e1') AS score, secret_value
  FROM data
)
SELECT secret_value FROM computed ORDER BY score DESC LIMIT 1;
