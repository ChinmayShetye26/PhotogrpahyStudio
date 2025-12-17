-- ============================================
-- CREATE TRIGGER FOR INVENTORY MANAGEMENT
-- ============================================

CREATE OR REPLACE TRIGGER trg_decrement_product_stock
AFTER INSERT ON INVOICE_LINEITEM
FOR EACH ROW
BEGIN
    UPDATE PRODUCT
    SET INITIALSTOCKLEVEL = INITIALSTOCKLEVEL - :NEW.QUANTITY
    WHERE PRODUCTID = :NEW.PRODUCTID;
    
    -- Log the update (optional)
    DBMS_OUTPUT.PUT_LINE('Product ID ' || :NEW.PRODUCTID || 
                        ' stock reduced by ' || :NEW.QUANTITY);
END;
/

-- Test the trigger
BEGIN
    DBMS_OUTPUT.PUT_LINE('Trigger created successfully!');
    DBMS_OUTPUT.PUT_LINE('To test: INSERT INTO INVOICE_LINEITEM VALUES (1005, 3001, 2);');
    DBMS_OUTPUT.PUT_LINE('Then check: SELECT * FROM PRODUCT WHERE PRODUCTID = 3001;');
END;
/