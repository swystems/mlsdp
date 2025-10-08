WITH zipped AS (
  SELECT
    xs,
    ys,
    xs * ys AS product
  FROM input_data
),
summed AS (
  SELECT
    SUM(product) AS inner_product
  FROM zipped
)
SELECT inner_product FROM summed;

