WITH zipped AS (
  SELECT
    xs,
    ys,
    (xs - ys) AS diff
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
SELECT inner_product * 1 / 2 / 1000 AS output FROM summed;

