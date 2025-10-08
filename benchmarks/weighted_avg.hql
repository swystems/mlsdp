ADD JAR /opt/hive/lib/hive_udfs.jar;
CREATE TEMPORARY FUNCTION declassify AS 'com.example.hive.udf.DeclassifyUDF';
CREATE TEMPORARY FUNCTION noise AS 'com.example.hive.udf.NoiseUDF';

WITH computed AS (
  SELECT declassify(secret_value, 'L2', 'e1') AS declassified_value, weight
  FROM weighted_data
)
SELECT noise(SUM(declassified_value * weight) / COUNT(*), 'e2') AS weighted_avg_result
FROM computed;

