-- The generated records represent positive purchases only. Refunds need a separate policy.
SELECT COUNT(*) AS row_count,
       COUNT(DISTINCT customer_id) AS customers,
       SUM(CASE WHEN amount <= 0 OR amount IS NULL THEN 1 ELSE 0 END) AS invalid_amounts,
       SUM(CASE WHEN day < 0 OR day >= 300 OR day IS NULL OR day != CAST(day AS INTEGER) THEN 1 ELSE 0 END) AS invalid_days,
       SUM(CASE WHEN category NOT IN (0,1,2,3) OR category IS NULL THEN 1 ELSE 0 END) AS invalid_categories,
       SUM(CASE WHEN customer_id < 0 OR customer_id >= 1200 OR customer_id IS NULL OR customer_id != CAST(customer_id AS INTEGER) THEN 1 ELSE 0 END) AS invalid_customers
FROM transactions;
-- Possible collisions only: identical values can represent distinct legitimate purchases.
SELECT customer_id, day, category, amount, COUNT(*) AS occurrences
FROM transactions GROUP BY customer_id, day, category, amount HAVING COUNT(*) > 1;
SELECT category, COUNT(*) AS transactions, ROUND(SUM(amount),2) AS gross_spend
FROM transactions GROUP BY category ORDER BY category;
