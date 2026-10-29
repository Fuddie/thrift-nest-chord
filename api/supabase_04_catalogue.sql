-- Additional fictional demo fixtures, not extracted live inventory.
-- Skip existing IDs; never reset edited prices or stock on rerun.
INSERT INTO thrift_demo.products
(item_id,name,size_label,measurements_json,price_minor,currency,availability,updated_at)
VALUES
('TN-DEMO-101','Demo purple patterned dress','UK 16','{"length":{"value":39,"unit":"in","basis":"garment_length"}}',820000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-102','Demo tan shirt dress','UK 14','{"length":{"value":37,"unit":"in","basis":"garment_length"}}',780000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-103','Demo orange dress','UK 12','{"length":{"value":35,"unit":"in","basis":"garment_length"}}',750000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-104','Demo patterned playsuit','UK 10','{"length":{"value":33,"unit":"in","basis":"garment_length"}}',620000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-105','Demo grey trousers','UK 16','{"waist":{"value":36,"unit":"in","basis":"circumference"},"length":{"value":41,"unit":"in","basis":"garment_length"}}',1320000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-106','Demo checked trousers','UK 14','{"waist":{"value":34,"unit":"in","basis":"circumference"},"length":{"value":42,"unit":"in","basis":"garment_length"}}',1050000,'NGN','available',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-107','Demo black high-low dress','UK 14','{}',720000,'NGN','sold',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-108','Demo cream trousers','UK 14','{}',1420000,'NGN','sold',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-109','Demo brown trousers','UK 12','{}',1280000,'NGN','sold',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-110','Demo black striped trousers','UK 10','{}',1380000,'NGN','sold',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-111','Demo black tailored trousers','UK 12','{}',1300000,'NGN','unknown',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-112','Demo navy slim trousers','UK 16','{}',1350000,'NGN','unknown',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-113','Demo tan trousers','UK 18','{}',1400000,'NGN','unknown',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
('TN-DEMO-114','Demo patterned wideleg trousers','UK 20/22','{}',1250000,'NGN','unknown',to_char(current_timestamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
ON CONFLICT (item_id) DO NOTHING;
