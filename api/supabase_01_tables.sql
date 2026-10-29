BEGIN;
CREATE SCHEMA IF NOT EXISTS thrift_demo;
SET LOCAL search_path TO thrift_demo, pg_catalog;

CREATE TABLE IF NOT EXISTS thrift_demo.products (
  item_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  measurements_json TEXT NOT NULL,
  price_minor INTEGER NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  availability TEXT NOT NULL CHECK (availability IN ('available','sold','unknown')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS thrift_demo.orders (
  order_id TEXT PRIMARY KEY,
  customer_ref TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES thrift_demo.products(item_id),
  price_minor INTEGER NOT NULL CHECK (price_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'NGN'),
  order_status TEXT NOT NULL CHECK (order_status = 'pending'),
  payment_status TEXT NOT NULL CHECK (payment_status = 'unverified'),
  created_at TEXT NOT NULL,
  UNIQUE(customer_ref, item_id)
);

-- Entire catalogue is fictional. Prices are kobo, not naira.
-- Reapplying skips existing item IDs and never resets edited stock.
INSERT INTO thrift_demo.products VALUES
('TN-DEMO-001','Demo navy wide-leg trousers','UK 12',
 '{"waist":{"value":30,"unit":"in","basis":"circumference"},"hips":{"value":40,"unit":"in","basis":"circumference"},"length":{"value":42,"unit":"in","basis":"garment_length"}}',
 850000,'NGN','available','2026-10-27T00:00:00Z'),
('TN-DEMO-002','Demo floral dress','UK 10',
 '{"bust":{"value":34,"unit":"in","basis":"circumference"},"length":{"value":38,"unit":"in","basis":"garment_length"}}',
 650000,'NGN','sold','2026-10-27T00:00:00Z'),
('TN-DEMO-003','Demo cream blouse','M','{}',
 450000,'NGN','available','2026-10-27T00:00:00Z'),
('TN-DEMO-004','Demo denim shorts','UK 8','{}',
 500000,'NGN','unknown','2026-10-27T00:00:00Z')
ON CONFLICT (item_id) DO NOTHING;

-- Restrict this test schema to trusted server-side access.
ALTER TABLE thrift_demo.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE thrift_demo.orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA thrift_demo FROM PUBLIC, anon, authenticated;
REVOKE ALL ON thrift_demo.products, thrift_demo.orders FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA thrift_demo TO service_role;
GRANT SELECT ON thrift_demo.products TO service_role;
GRANT SELECT, INSERT ON thrift_demo.orders TO service_role;
COMMIT;

-- Initial checks: four products, zero orders on a new project.
SELECT item_id, name, price_minor / 100.0 AS price_ngn, availability
FROM thrift_demo.products ORDER BY item_id;
SELECT COUNT(*) AS pending_order_count FROM thrift_demo.orders;
