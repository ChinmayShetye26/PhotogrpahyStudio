-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Foreign key indexes
CREATE INDEX idx_client_staff ON CLIENT(MANAGEDBY_STAFFEMAIL);
CREATE INDEX idx_client_marketinglead ON CLIENT(MARKETINGLEAD_EMAIL);
CREATE INDEX idx_session_client ON PHOTO_SESSION(CLIENTEMAIL);
CREATE INDEX idx_invoice_client ON INVOICE(CLIENTEMAIL);
CREATE INDEX idx_sa_staff ON PHOTO_SESSION_ASSIGNMENT(STAFFEMAIL);
CREATE INDEX idx_sa_session ON PHOTO_SESSION_ASSIGNMENT(SESSIONID);
CREATE INDEX idx_il_invoice ON INVOICE_LINEITEM(INVOICENUMBER);
CREATE INDEX idx_il_product ON INVOICE_LINEITEM(PRODUCTID);

-- Query optimization indexes
CREATE INDEX idx_client_name ON CLIENT(LASTNAME, FIRSTNAME);
CREATE INDEX idx_client_zip ON CLIENT(ZIP);
CREATE INDEX idx_staff_name ON STAFF(LASTNAME, FIRSTNAME);
CREATE INDEX idx_session_date ON PHOTO_SESSION(SESSIONDATE);
CREATE INDEX idx_session_type ON PHOTO_SESSION(SESSIONTYPE);
CREATE INDEX idx_invoice_date ON INVOICE(INVOICEDATE);
CREATE INDEX idx_product_name ON PRODUCT(PRODUCTNAME);
CREATE INDEX idx_product_supplier ON PRODUCT(SUPPLIER);

-- Display created indexes
SELECT index_name, table_name FROM user_indexes 
WHERE table_name IN ('STAFF', 'CLIENT', 'PHOTO_SESSION', 'INVOICE', 'PRODUCT')
ORDER BY table_name;