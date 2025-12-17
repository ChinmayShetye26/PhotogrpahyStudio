-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- 1. INSERT STAFF
INSERT INTO STAFF VALUES ('alice.brown@studio.com', 'Alice', 'Brown', '555-1001', 'Lead Photographer', DATE '2020-05-10', 45.00, '123 Main St', 'New York', 'NY', '10001');
INSERT INTO STAFF VALUES ('bob.smith@studio.com', 'Bob', 'Smith', '555-1002', 'Second Photographer', DATE '2021-02-15', 35.00, '456 Oak Ave', 'New York', 'NY', '10002');
INSERT INTO STAFF VALUES ('carol.jones@studio.com', 'Carol', 'Jones', '555-1003', 'Editor', DATE '2019-08-22', 40.00, '789 Pine Rd', 'Brooklyn', 'NY', '11201');
INSERT INTO STAFF VALUES ('david.lee@studio.com', 'David', 'Lee', '555-1004', 'Studio Manager', DATE '2018-03-30', 50.00, '321 Elm St', 'Queens', 'NY', '11355');
INSERT INTO STAFF VALUES ('emma.white@studio.com', 'Emma', 'White', '555-1005', 'Customer Success', DATE '2022-01-10', 30.00, '654 Maple Dr', 'New York', 'NY', '10003');

COMMIT;

-- 2. INSERT MARKETING LEADS
INSERT INTO MARKETING_LEAD VALUES ('maya.lead@example.com', 'Maya', 'Green', DATE '2024-03-10', 'Wedding');
INSERT INTO MARKETING_LEAD VALUES ('liam.lead@example.com', 'Liam', 'Gray', DATE '2024-02-05', 'Family');
INSERT INTO MARKETING_LEAD VALUES ('noah.lead@example.com', 'Noah', 'King', DATE '2024-03-18', 'Portrait');
INSERT INTO MARKETING_LEAD VALUES ('olivia.lead@example.com', 'Olivia', 'Hill', DATE '2024-04-12', 'Wedding');
INSERT INTO MARKETING_LEAD VALUES ('ava.lead@example.com', 'Ava', 'Fox', DATE '2024-05-20', 'Engagement');

COMMIT;

-- 3. INSERT CLIENTS
INSERT INTO CLIENT VALUES ('maya.client@example.com', 'Maya', 'Green', '555-2001', '123 Sunset Blvd', 'New York', 'NY', '10001', 'Instagram', 'alice.brown@studio.com', 'maya.lead@example.com', NULL);
INSERT INTO CLIENT VALUES ('liam.client@example.com', 'Liam', 'Gray', '555-2002', '456 Sunrise Ave', 'New York', 'NY', '10002', 'Referral', 'bob.smith@studio.com', 'liam.lead@example.com', DATE '2024-06-20');
INSERT INTO CLIENT VALUES ('noah.client@example.com', 'Noah', 'King', '555-2003', '789 Twilight Ln', 'Brooklyn', 'NY', '11201', 'Google', 'carol.jones@studio.com', 'noah.lead@example.com', DATE '2024-07-05');
INSERT INTO CLIENT VALUES ('olivia.client@example.com', 'Olivia', 'Hill', '555-2004', '321 Dawn Ct', 'Queens', 'NY', '11355', 'Facebook', 'david.lee@studio.com', 'olivia.lead@example.com', DATE '2024-07-10');
INSERT INTO CLIENT VALUES ('ava.client@example.com', 'Ava', 'Fox', '555-2005', '654 Dusk Way', 'New York', 'NY', '10003', 'Instagram', 'emma.white@studio.com', 'ava.lead@example.com', DATE '2024-07-20');

COMMIT;

-- 4. INSERT PHOTO SESSIONS
INSERT INTO PHOTO_SESSION VALUES (1981, 'Wedding', DATE '2024-06-15', '13:00', '17:00', 'Sunset Park', 'Gold Wedding', 2000.00, 'Outdoor ceremony', 'maya.client@example.com', 500.00);
INSERT INTO PHOTO_SESSION VALUES (1982, 'Family', DATE '2024-06-20', '10:00', '12:00', 'Studio A', 'Family Mini', 300.00, NULL, 'liam.client@example.com', 100.00);
INSERT INTO PHOTO_SESSION VALUES (1983, 'Portrait', DATE '2024-07-05', '09:00', '10:00', 'Studio B', 'Portrait Classic', 250.00, 'Senior portrait', 'noah.client@example.com', 50.00);
INSERT INTO PHOTO_SESSION VALUES (1984, 'Newborn', DATE '2024-07-10', '13:00', '15:00', 'Studio A', 'Newborn Deluxe', 400.00, NULL, 'olivia.client@example.com', 100.00);
INSERT INTO PHOTO_SESSION VALUES (1985, 'Engagement', DATE '2024-07-20', '17:00', '19:00', 'Downtown', 'Engagement City', 500.00, 'Sunset photos', 'ava.client@example.com', 150.00);

COMMIT;

-- 5. INSERT INVOICES
INSERT INTO INVOICE VALUES (1001, DATE '2024-06-16', 'Wedding Session + Prints', 2160.00, 172.80, 2332.80, 660.00, 1500.00, DATE '2024-08-01', 'maya.client@example.com');
INSERT INTO INVOICE VALUES (1002, DATE '2024-06-21', 'Family Session', 324.00, 25.92, 349.92, 0.00, 324.00, NULL, 'liam.client@example.com');
INSERT INTO INVOICE VALUES (1003, DATE '2024-07-06', 'Portrait Session', 270.00, 21.60, 291.60, 0.00, 270.00, NULL, 'noah.client@example.com');
INSERT INTO INVOICE VALUES (1004, DATE '2024-07-11', 'Newborn Session + Album', 432.00, 34.56, 466.56, 132.00, 300.00, DATE '2024-08-15', 'olivia.client@example.com');
INSERT INTO INVOICE VALUES (1005, DATE '2024-07-21', 'Engagement Session', 540.00, 43.20, 583.20, 0.00, 540.00, NULL, 'ava.client@example.com');

COMMIT;

-- 6. INSERT PRODUCTS
INSERT INTO PRODUCT VALUES (3001, '8x10 Print', 5.00, 20.00, 200, 'Local Lab');
INSERT INTO PRODUCT VALUES (3002, 'Wedding Album', 50.00, 200.00, 50, 'Premium Albums Inc.');
INSERT INTO PRODUCT VALUES (3003, 'Canvas 16x20', 30.00, 120.00, 80, 'Canvas World');
INSERT INTO PRODUCT VALUES (3004, 'Digital Download Pack', 0.00, 150.00, 9999, 'In-house');
INSERT INTO PRODUCT VALUES (3005, 'Mini Album', 25.00, 90.00, 60, 'Premium Albums Inc.');

COMMIT;

-- 7. INSERT SESSION ASSIGNMENTS
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1981, 'alice.brown@studio.com', 'Lead');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1981, 'bob.smith@studio.com', 'Second');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1982, 'bob.smith@studio.com', 'Lead');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1983, 'carol.jones@studio.com', 'Lead');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1984, 'david.lee@studio.com', 'Lead');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1985, 'alice.brown@studio.com', 'Lead');
INSERT INTO PHOTO_SESSION_ASSIGNMENT VALUES (1985, 'emma.white@studio.com', 'Assistant');

COMMIT;

-- 8. INSERT INVOICE LINE ITEMS
INSERT INTO INVOICE_LINEITEM VALUES (1001, 3001, 3);
INSERT INTO INVOICE_LINEITEM VALUES (1001, 3002, 1);
INSERT INTO INVOICE_LINEITEM VALUES (1004, 3002, 1);
INSERT INTO INVOICE_LINEITEM VALUES (1004, 3003, 1);
INSERT INTO INVOICE_LINEITEM VALUES (1005, 3004, 1);

COMMIT;

-- Verify data insertion
SELECT 'STAFF' AS TABLE_NAME, COUNT(*) AS RECORD_COUNT FROM STAFF
UNION ALL
SELECT 'MARKETING_LEAD', COUNT(*) FROM MARKETING_LEAD
UNION ALL
SELECT 'CLIENT', COUNT(*) FROM CLIENT
UNION ALL
SELECT 'PHOTO_SESSION', COUNT(*) FROM PHOTO_SESSION
UNION ALL
SELECT 'INVOICE', COUNT(*) FROM INVOICE
UNION ALL
SELECT 'PRODUCT', COUNT(*) FROM PRODUCT
UNION ALL
SELECT 'PHOTO_SESSION_ASSIGNMENT', COUNT(*) FROM PHOTO_SESSION_ASSIGNMENT
UNION ALL
SELECT 'INVOICE_LINEITEM', COUNT(*) FROM INVOICE_LINEITEM;