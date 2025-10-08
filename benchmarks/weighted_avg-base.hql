WITH computed AS (
  SELECT secret_value AS declassified_value, weight
  FROM weighted_data
)
SELECT (SUM(declassified_value * weight) / COUNT(*)) AS weighted_avg_result
FROM computed;

