// ============================================
// MAIN EXPRESS SERVER - PHOTOGRAPHY STUDIO MANAGEMENT
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:3000'], // Frontend and self
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// API ROUTES
// ============================================

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Photography Studio API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================
// CLIENT ROUTES
// ============================================

// Get all clients
app.get('/api/clients', async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   s.FIRSTNAME || ' ' || s.LASTNAME AS MANAGER_NAME,
                   s.ROLE AS MANAGER_ROLE,
                   ml.INTERESTS AS LEAD_INTERESTS,
                   ml.DATESIGNEDUP AS LEAD_SIGNUP_DATE
            FROM CLIENT c
            LEFT JOIN STAFF s ON c.MANAGEDBY_STAFFEMAIL = s.STAFFEMAIL
            LEFT JOIN MARKETING_LEAD ml ON c.MARKETINGLEAD_EMAIL = ml.EMAIL
            ORDER BY c.LASTNAME, c.FIRSTNAME
        `;
        const clients = await db.executeQuery(query);
        res.json(clients);
    } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ error: 'Failed to fetch clients', details: err.message });
    }
});

// Get single client by email
app.get('/api/clients/:email', async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   s.FIRSTNAME || ' ' || s.LASTNAME AS MANAGER_NAME,
                   s.PHONE AS MANAGER_PHONE,
                   s.EMAIL AS MANAGER_EMAIL
            FROM CLIENT c
            LEFT JOIN STAFF s ON c.MANAGEDBY_STAFFEMAIL = s.STAFFEMAIL
            WHERE c.CLIENTEMAIL = :email
        `;
        const clients = await db.executeQuery(query, [req.params.email]);
        
        if (clients.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }
        
        res.json(clients[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new client
app.post('/api/clients', async (req, res) => {
    try {
        const {
            clientEmail,
            firstName,
            lastName,
            phone,
            street,
            city,
            state,
            zip,
            leadSource,
            managedByStaffEmail,
            marketingLeadEmail
        } = req.body;

        const query = `
            INSERT INTO CLIENT (
                CLIENTEMAIL, FIRSTNAME, LASTNAME, PHONE, 
                STREET, CITY, STATE, ZIP, LEADSOURCE, 
                MANAGEDBY_STAFFEMAIL, MARKETINGLEAD_EMAIL, LAST_SESSION_DATE
            ) VALUES (
                :1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, NULL
            )
        `;

        const params = [
            clientEmail, firstName, lastName, phone,
            street, city, state, zip, leadSource,
            managedByStaffEmail, marketingLeadEmail
        ];

        await db.executeQuery(query, params);
        res.status(201).json({ 
            success: true,
            message: 'Client created successfully',
            clientEmail: clientEmail
        });
    } catch (err) {
        console.error('Error creating client:', err);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create client', 
            details: err.message 
        });
    }
});

// Update client
app.put('/api/clients/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const updates = req.body;
        
        // Build dynamic update query
        const fields = [];
        const values = [];
        let index = 1;
        
        Object.keys(updates).forEach(key => {
            if (key !== 'clientEmail') { // Don't update primary key
                fields.push(`${key.toUpperCase()} = :${index}`);
                values.push(updates[key]);
                index++;
            }
        });
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        values.push(email); // Add email for WHERE clause
        
        const query = `
            UPDATE CLIENT 
            SET ${fields.join(', ')}
            WHERE CLIENTEMAIL = :${index}
        `;
        
        await db.executeQuery(query, values);
        res.json({ success: true, message: 'Client updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get client sessions
app.get('/api/clients/:email/sessions', async (req, res) => {
    try {
        const query = `
            SELECT ps.*, 
                   (SELECT COUNT(*) FROM PHOTO_SESSION_ASSIGNMENT psa 
                    WHERE psa.SESSIONID = ps.SESSIONID) AS STAFF_COUNT
            FROM PHOTO_SESSION ps
            WHERE ps.CLIENTEMAIL = :email
            ORDER BY ps.SESSIONDATE DESC
        `;
        const sessions = await db.executeQuery(query, [req.params.email]);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SESSION ROUTES
// ============================================

// Get all sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const query = `
            SELECT ps.*, 
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME,
                   c.PHONE AS CLIENT_PHONE,
                   c.CLIENTEMAIL AS CLIENT_EMAIL,
                   (SELECT COUNT(*) FROM PHOTO_SESSION_ASSIGNMENT psa 
                    WHERE psa.SESSIONID = ps.SESSIONID) AS STAFF_ASSIGNED
            FROM PHOTO_SESSION ps
            JOIN CLIENT c ON ps.CLIENTEMAIL = c.CLIENTEMAIL
            ORDER BY ps.SESSIONDATE DESC, ps.SESSIONSTARTTIME
        `;
        const sessions = await db.executeQuery(query);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single session by ID
app.get('/api/sessions/:id', async (req, res) => {
    try {
        const sessionQuery = `
            SELECT ps.*, 
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME,
                   c.PHONE AS CLIENT_PHONE,
                   c.STREET, c.CITY, c.STATE, c.ZIP
            FROM PHOTO_SESSION ps
            JOIN CLIENT c ON ps.CLIENTEMAIL = c.CLIENTEMAIL
            WHERE ps.SESSIONID = :id
        `;
        
        const staffQuery = `
            SELECT psa.*, 
                   s.FIRSTNAME || ' ' || s.LASTNAME AS STAFF_NAME,
                   s.ROLE AS STAFF_MAIN_ROLE
            FROM PHOTO_SESSION_ASSIGNMENT psa
            JOIN STAFF s ON psa.STAFFEMAIL = s.STAFFEMAIL
            WHERE psa.SESSIONID = :id
            ORDER BY psa.ROLE
        `;
        
        const [session] = await db.executeQuery(sessionQuery, [req.params.id]);
        const staff = await db.executeQuery(staffQuery, [req.params.id]);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            ...session,
            assignedStaff: staff
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new session
app.post('/api/sessions', async (req, res) => {
    try {
        const {
            sessionId,
            sessionType,
            sessionDate,
            sessionStartTime,
            sessionEndTime,
            location,
            packageName,
            sessionFee,
            notes,
            clientEmail,
            depositPaid
        } = req.body;
        
        const query = `
            INSERT INTO PHOTO_SESSION (
                SESSIONID, SESSIONTYPE, SESSIONDATE, SESSIONSTARTTIME,
                SESSIONENDTIME, LOCATION, PACKAGENAME, SESSIONFEE,
                NOTES, CLIENTEMAIL, DEPOSITPAID
            ) VALUES (
                :1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11
            )
        `;
        
        const params = [
            sessionId, sessionType, sessionDate, sessionStartTime,
            sessionEndTime, location, packageName, sessionFee,
            notes, clientEmail, depositPaid
        ];
        
        await db.executeQuery(query, params);
        
        // Update client's last session date
        const updateClientQuery = `
            UPDATE CLIENT 
            SET LAST_SESSION_DATE = TO_DATE(:sessionDate, 'YYYY-MM-DD')
            WHERE CLIENTEMAIL = :clientEmail
        `;
        await db.executeQuery(updateClientQuery, [sessionDate, clientEmail]);
        
        res.status(201).json({ 
            success: true, 
            message: 'Session created successfully',
            sessionId: sessionId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get sessions by date range
app.get('/api/sessions/range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = `
            SELECT ps.*, 
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME,
                   c.PHONE AS CLIENT_PHONE,
                   (SELECT LISTAGG(s.FIRSTNAME || ' ' || s.LASTNAME, ', ') 
                    WITHIN GROUP (ORDER BY psa.ROLE)
                    FROM PHOTO_SESSION_ASSIGNMENT psa
                    JOIN STAFF s ON psa.STAFFEMAIL = s.STAFFEMAIL
                    WHERE psa.SESSIONID = ps.SESSIONID) AS STAFF_NAMES
            FROM PHOTO_SESSION ps
            JOIN CLIENT c ON ps.CLIENTEMAIL = c.CLIENTEMAIL
            WHERE ps.SESSIONDATE BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') 
                                  AND TO_DATE(:endDate, 'YYYY-MM-DD')
            ORDER BY ps.SESSIONDATE, ps.SESSIONSTARTTIME
        `;
        const sessions = await db.executeQuery(query, [startDate, endDate]);
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assign staff to session
app.post('/api/sessions/:id/assign-staff', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { staffEmail, role } = req.body;
        
        const query = `
            INSERT INTO PHOTO_SESSION_ASSIGNMENT (SESSIONID, STAFFEMAIL, ROLE)
            VALUES (:1, :2, :3)
        `;
        
        await db.executeQuery(query, [sessionId, staffEmail, role]);
        res.status(201).json({ success: true, message: 'Staff assigned successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// INVOICE ROUTES
// ============================================

// Get all invoices
app.get('/api/invoices', async (req, res) => {
    try {
        const query = `
            SELECT i.*, 
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME,
                   c.PHONE AS CLIENT_PHONE,
                   CASE 
                       WHEN i.BALANCEDUE = 0 THEN 'Paid'
                       WHEN i.BALANCEDUEDATE < SYSDATE THEN 'Overdue'
                       ELSE 'Pending'
                   END AS PAYMENT_STATUS
            FROM INVOICE i
            JOIN CLIENT c ON i.CLIENTEMAIL = c.CLIENTEMAIL
            ORDER BY i.INVOICEDATE DESC
        `;
        const invoices = await db.executeQuery(query);
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get invoice with line items
app.get('/api/invoices/:id/details', async (req, res) => {
    try {
        const invoiceQuery = `
            SELECT i.*, 
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME,
                   c.STREET, c.CITY, c.STATE, c.ZIP,
                   c.PHONE AS CLIENT_PHONE,
                   c.EMAIL AS CLIENT_EMAIL
            FROM INVOICE i
            JOIN CLIENT c ON i.CLIENTEMAIL = c.CLIENTEMAIL
            WHERE i.INVOICENUMBER = :id
        `;

        const lineItemsQuery = `
            SELECT il.*, 
                   p.PRODUCTNAME, 
                   p.SALEPRICE,
                   (il.QUANTITY * p.SALEPRICE) AS LINE_TOTAL
            FROM INVOICE_LINEITEM il
            JOIN PRODUCT p ON il.PRODUCTID = p.PRODUCTID
            WHERE il.INVOICENUMBER = :id
            ORDER BY p.PRODUCTNAME
        `;

        const [invoice] = await db.executeQuery(invoiceQuery, [req.params.id]);
        const lineItems = await db.executeQuery(lineItemsQuery, [req.params.id]);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({
            ...invoice,
            lineItems,
            lineItemsTotal: lineItems.reduce((sum, item) => sum + item.LINE_TOTAL, 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new invoice
app.post('/api/invoices', async (req, res) => {
    try {
        const {
            invoiceNumber,
            invoiceDate,
            description,
            subtotal,
            tax,
            totalDue,
            balanceDue,
            paymentReceived,
            balanceDueDate,
            clientEmail,
            lineItems
        } = req.body;

        // Start transaction
        await db.executeQuery('BEGIN');

        // Insert invoice
        const invoiceQuery = `
            INSERT INTO INVOICE (
                INVOICENUMBER, INVOICEDATE, DESCRIPTION, SUBTOTAL,
                TAX, TOTALDUE, BALANCEDUE, PAYMENTRECEIVED,
                BALANCEDUEDATE, CLIENTEMAIL
            ) VALUES (
                :1, TO_DATE(:2, 'YYYY-MM-DD'), :3, :4, :5, :6, :7, :8, 
                TO_DATE(:9, 'YYYY-MM-DD'), :10
            )
        `;

        await db.executeQuery(invoiceQuery, [
            invoiceNumber, invoiceDate, description, subtotal,
            tax, totalDue, balanceDue, paymentReceived,
            balanceDueDate || null, clientEmail
        ]);

        // Insert line items if provided
        if (lineItems && Array.isArray(lineItems)) {
            for (const item of lineItems) {
                const lineItemQuery = `
                    INSERT INTO INVOICE_LINEITEM (INVOICENUMBER, PRODUCTID, QUANTITY)
                    VALUES (:1, :2, :3)
                `;
                await db.executeQuery(lineItemQuery, [
                    invoiceNumber,
                    item.productId,
                    item.quantity
                ]);
            }
        }

        await db.executeQuery('COMMIT');
        
        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            invoiceNumber: invoiceNumber
        });
    } catch (err) {
        await db.executeQuery('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Update invoice payment
app.put('/api/invoices/:id/payment', async (req, res) => {
    try {
        const { paymentReceived } = req.body;
        
        const query = `
            UPDATE INVOICE 
            SET PAYMENTRECEIVED = PAYMENTRECEIVED + :payment,
                BALANCEDUE = TOTALDUE - (PAYMENTRECEIVED + :payment)
            WHERE INVOICENUMBER = :id
        `;
        
        await db.executeQuery(query, [paymentReceived, paymentReceived, req.params.id]);
        res.json({ success: true, message: 'Payment recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// STAFF ROUTES
// ============================================

// Get all staff
app.get('/api/staff', async (req, res) => {
    try {
        const query = `
            SELECT s.*,
                   (SELECT COUNT(*) FROM CLIENT c 
                    WHERE c.MANAGEDBY_STAFFEMAIL = s.STAFFEMAIL) AS CLIENTS_MANAGED,
                   (SELECT COUNT(*) FROM PHOTO_SESSION_ASSIGNMENT psa 
                    WHERE psa.STAFFEMAIL = s.STAFFEMAIL) AS SESSIONS_ASSIGNED
            FROM STAFF s
            ORDER BY s.ROLE, s.LASTNAME, s.FIRSTNAME
        `;
        const staff = await db.executeQuery(query);
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get staff assignments
app.get('/api/staff/:email/assignments', async (req, res) => {
    try {
        const query = `
            SELECT psa.*,
                   ps.SESSIONTYPE,
                   ps.SESSIONDATE,
                   ps.LOCATION,
                   c.FIRSTNAME || ' ' || c.LASTNAME AS CLIENT_NAME
            FROM PHOTO_SESSION_ASSIGNMENT psa
            JOIN PHOTO_SESSION ps ON psa.SESSIONID = ps.SESSIONID
            JOIN CLIENT c ON ps.CLIENTEMAIL = c.CLIENTEMAIL
            WHERE psa.STAFFEMAIL = :email
            ORDER BY ps.SESSIONDATE DESC
        `;
        const assignments = await db.executeQuery(query, [req.params.email]);
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PRODUCT ROUTES
// ============================================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const query = `
            SELECT p.*,
                   (SELECT SUM(il.QUANTITY) 
                    FROM INVOICE_LINEITEM il 
                    WHERE il.PRODUCTID = p.PRODUCTID) AS TOTAL_SOLD,
                   CASE 
                       WHEN p.INITIALSTOCKLEVEL <= 5 THEN 'Low'
                       WHEN p.INITIALSTOCKLEVEL <= 20 THEN 'Medium'
                       ELSE 'High'
                   END AS STOCK_STATUS
            FROM PRODUCT p
            ORDER BY p.PRODUCTNAME
        `;
        const products = await db.executeQuery(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const query = `
            SELECT p.*,
                   (SELECT COUNT(DISTINCT il.INVOICENUMBER) 
                    FROM INVOICE_LINEITEM il 
                    WHERE il.PRODUCTID = p.PRODUCTID) AS TIMES_SOLD
            FROM PRODUCT p
            WHERE p.PRODUCTID = :id
        `;
        const [product] = await db.executeQuery(query, [req.params.id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update product stock
app.put('/api/products/:id/stock', async (req, res) => {
    try {
        const { quantity } = req.body;
        
        const query = `
            UPDATE PRODUCT 
            SET INITIALSTOCKLEVEL = INITIALSTOCKLEVEL + :quantity
            WHERE PRODUCTID = :id
        `;
        
        await db.executeQuery(query, [quantity, req.params.id]);
        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get low stock products
app.get('/api/products/low-stock', async (req, res) => {
    try {
        const query = `
            SELECT * FROM PRODUCT 
            WHERE INITIALSTOCKLEVEL < 10 
            ORDER BY INITIALSTOCKLEVEL
        `;
        const products = await db.executeQuery(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// MARKETING LEAD ROUTES
// ============================================

// Get all marketing leads
app.get('/api/marketing-leads', async (req, res) => {
    try {
        const query = `
            SELECT ml.*,
                   CASE 
                       WHEN c.CLIENTEMAIL IS NOT NULL THEN 'Converted'
                       ELSE 'Lead'
                   END AS STATUS,
                   c.CLIENTEMAIL AS CONVERTED_TO_CLIENT
            FROM MARKETING_LEAD ml
            LEFT JOIN CLIENT c ON ml.EMAIL = c.MARKETINGLEAD_EMAIL
            ORDER BY ml.DATESIGNEDUP DESC
        `;
        const leads = await db.executeQuery(query);
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// Get dashboard statistics
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        // Multiple queries for dashboard stats
        const [
            [{ TOTAL_CLIENTS }],
            [{ UPCOMING_SESSIONS }],
            [{ MONTHLY_REVENUE }],
            [{ OUTSTANDING_BALANCE }],
            [{ TOTAL_STAFF }],
            [{ ACTIVE_PRODUCTS }]
        ] = await Promise.all([
            db.executeQuery(`SELECT COUNT(*) AS TOTAL_CLIENTS FROM CLIENT`),
            db.executeQuery(`SELECT COUNT(*) AS UPCOMING_SESSIONS FROM PHOTO_SESSION WHERE SESSIONDATE >= TRUNC(SYSDATE)`),
            db.executeQuery(`SELECT NVL(SUM(PAYMENTRECEIVED), 0) AS MONTHLY_REVENUE FROM INVOICE WHERE EXTRACT(MONTH FROM INVOICEDATE) = EXTRACT(MONTH FROM SYSDATE)`),
            db.executeQuery(`SELECT NVL(SUM(BALANCEDUE), 0) AS OUTSTANDING_BALANCE FROM INVOICE WHERE BALANCEDUE > 0`),
            db.executeQuery(`SELECT COUNT(*) AS TOTAL_STAFF FROM STAFF`),
            db.executeQuery(`SELECT COUNT(*) AS ACTIVE_PRODUCTS FROM PRODUCT WHERE INITIALSTOCKLEVEL > 0`)
        ]);

        res.json({
            totalClients: TOTAL_CLIENTS,
            upcomingSessions: UPCOMING_SESSIONS,
            monthlyRevenue: MONTHLY_REVENUE,
            outstandingBalance: OUTSTANDING_BALANCE,
            totalStaff: TOTAL_STAFF,
            activeProducts: ACTIVE_PRODUCTS
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get revenue by month
app.get('/api/analytics/revenue-trends', async (req, res) => {
    try {
        const query = `
            SELECT TO_CHAR(INVOICEDATE, 'YYYY-MM') AS MONTH,
                   SUM(PAYMENTRECEIVED) AS REVENUE,
                   COUNT(*) AS INVOICE_COUNT
            FROM INVOICE
            WHERE INVOICEDATE >= ADD_MONTHS(SYSDATE, -12)
            GROUP BY TO_CHAR(INVOICEDATE, 'YYYY-MM')
            ORDER BY MONTH
        `;
        const trends = await db.executeQuery(query);
        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get session types distribution
app.get('/api/analytics/session-types', async (req, res) => {
    try {
        const query = `
            SELECT SESSIONTYPE,
                   COUNT(*) AS SESSION_COUNT,
                   AVG(SESSIONFEE) AS AVG_FEE,
                   SUM(SESSIONFEE) AS TOTAL_REVENUE
            FROM PHOTO_SESSION
            WHERE SESSIONDATE >= ADD_MONTHS(SYSDATE, -6)
            GROUP BY SESSIONTYPE
            ORDER BY SESSION_COUNT DESC
        `;
        const sessionTypes = await db.executeQuery(query);
        res.json(sessionTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Marketing conversion analysis
app.get('/api/analytics/marketing-conversion', async (req, res) => {
    try {
        const query = `
            SELECT ml.INTERESTS,
                   COUNT(DISTINCT ml.EMAIL) AS TOTAL_LEADS,
                   COUNT(DISTINCT c.CLIENTEMAIL) AS CONVERTED_CLIENTS,
                   ROUND((COUNT(DISTINCT c.CLIENTEMAIL) * 100.0 / 
                         NULLIF(COUNT(DISTINCT ml.EMAIL), 0)), 2) AS CONVERSION_RATE
            FROM MARKETING_LEAD ml
            LEFT JOIN CLIENT c ON ml.EMAIL = c.MARKETINGLEAD_EMAIL
            GROUP BY ml.INTERESTS
            ORDER BY CONVERSION_RATE DESC
        `;
        const results = await db.executeQuery(query);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Staff performance analytics
app.get('/api/analytics/staff-performance', async (req, res) => {
    try {
        const query = `
            SELECT s.STAFFEMAIL,
                   s.FIRSTNAME || ' ' || s.LASTNAME AS STAFF_NAME,
                   s.ROLE,
                   COUNT(DISTINCT c.CLIENTEMAIL) AS CLIENTS_MANAGED,
                   COUNT(DISTINCT psa.SESSIONID) AS SESSIONS_ASSIGNED,
                   (SELECT COUNT(*) FROM PHOTO_SESSION ps
                    JOIN PHOTO_SESSION_ASSIGNMENT psa2 ON ps.SESSIONID = psa2.SESSIONID
                    WHERE psa2.STAFFEMAIL = s.STAFFEMAIL
                    AND ps.SESSIONDATE >= ADD_MONTHS(SYSDATE, -3)) AS RECENT_SESSIONS
            FROM STAFF s
            LEFT JOIN CLIENT c ON s.STAFFEMAIL = c.MANAGEDBY_STAFFEMAIL
            LEFT JOIN PHOTO_SESSION_ASSIGNMENT psa ON s.STAFFEMAIL = psa.STAFFEMAIL
            GROUP BY s.STAFFEMAIL, s.FIRSTNAME, s.LASTNAME, s.ROLE
            ORDER BY CLIENTS_MANAGED DESC
        `;
        const performance = await db.executeQuery(query);
        res.json(performance);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// UTILITY ROUTES
// ============================================

// Search across multiple tables
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ clients: [], sessions: [], invoices: [] });
        }

        const searchTerm = `%${q.toUpperCase()}%`;
        
        const [clients, sessions, invoices] = await Promise.all([
            db.executeQuery(`
                SELECT CLIENTEMAIL AS id, 
                       FIRSTNAME || ' ' || LASTNAME AS name,
                       'Client' AS type,
                       EMAIL AS email
                FROM CLIENT 
                WHERE UPPER(FIRSTNAME) LIKE :term 
                   OR UPPER(LASTNAME) LIKE :term 
                   OR UPPER(CLIENTEMAIL) LIKE :term
                FETCH FIRST 10 ROWS ONLY
            `, [searchTerm]),
            
            db.executeQuery(`
                SELECT SESSIONID AS id, 
                       SESSIONTYPE || ' Session' AS name,
                       'Session' AS type,
                       TO_CHAR(SESSIONDATE, 'YYYY-MM-DD') AS date
                FROM PHOTO_SESSION 
                WHERE UPPER(SESSIONTYPE) LIKE :term 
                   OR UPPER(LOCATION) LIKE :term
                FETCH FIRST 10 ROWS ONLY
            `, [searchTerm]),
            
            db.executeQuery(`
                SELECT INVOICENUMBER AS id, 
                       'Invoice #' || INVOICENUMBER AS name,
                       'Invoice' AS type,
                       TO_CHAR(INVOICEDATE, 'YYYY-MM-DD') AS date
                FROM INVOICE 
                WHERE TO_CHAR(INVOICENUMBER) LIKE :term
                FETCH FIRST 10 ROWS ONLY
            `, [`%${q}%`])
        ]);

        res.json({
            clients,
            sessions,
            invoices,
            totalResults: clients.length + sessions.length + invoices.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
    try {
        // Initialize database connection
        await db.initialize();
        
        // Test database connection
        const dbConnected = await db.testConnection();
        if (!dbConnected) {
            throw new Error('Database connection failed');
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log('🚀 PHOTOGRAPHY STUDIO MANAGEMENT SYSTEM');
            console.log('='.repeat(60));
            console.log(`📡 Server URL: http://localhost:${PORT}`);
            console.log(`🔌 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🗄️  Database: Connected to ${db.dbConfig.user}`);
            console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
            console.log('='.repeat(60));
            console.log('\n📋 AVAILABLE ENDPOINTS:');
            console.log('  CLIENT MANAGEMENT:');
            console.log('    GET    /api/clients                  - Get all clients');
            console.log('    GET    /api/clients/:email           - Get single client');
            console.log('    POST   /api/clients                  - Create client');
            console.log('    PUT    /api/clients/:email           - Update client');
            console.log('    GET    /api/clients/:email/sessions  - Get client sessions');
            console.log('\n  SESSION MANAGEMENT:');
            console.log('    GET    /api/sessions                 - Get all sessions');
            console.log('    GET    /api/sessions/:id             - Get session details');
            console.log('    POST   /api/sessions                 - Create session');
            console.log('    GET    /api/sessions/range           - Get sessions by date range');
            console.log('    POST   /api/sessions/:id/assign-staff - Assign staff to session');
            console.log('\n  INVOICE MANAGEMENT:');
            console.log('    GET    /api/invoices                 - Get all invoices');
            console.log('    GET    /api/invoices/:id/details     - Get invoice with line items');
            console.log('    POST   /api/invoices                 - Create invoice');
            console.log('    PUT    /api/invoices/:id/payment     - Record payment');
            console.log('\n  STAFF MANAGEMENT:');
            console.log('    GET    /api/staff                    - Get all staff');
            console.log('    GET    /api/staff/:email/assignments - Get staff assignments');
            console.log('\n  PRODUCT MANAGEMENT:');
            console.log('    GET    /api/products                 - Get all products');
            console.log('    GET    /api/products/:id             - Get single product');
            console.log('    PUT    /api/products/:id/stock       - Update stock');
            console.log('    GET    /api/products/low-stock       - Get low stock products');
            console.log('\n  ANALYTICS:');
            console.log('    GET    /api/analytics/dashboard      - Dashboard statistics');
            console.log('    GET    /api/analytics/revenue-trends - Revenue trends');
            console.log('    GET    /api/analytics/session-types  - Session type analysis');
            console.log('    GET    /api/analytics/marketing-conversion - Marketing analytics');
            console.log('    GET    /api/analytics/staff-performance - Staff performance');
            console.log('\n  UTILITIES:');
            console.log('    GET    /api/health                   - Health check');
            console.log('    GET    /api/search?q=term            - Global search');
            console.log('    GET    /api/marketing-leads          - Get marketing leads');
            console.log('='.repeat(60));
        });

    } catch (err) {
        console.error('\n❌ FAILED TO START SERVER:', err.message);
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('  1. Make sure Oracle Database is running');
        console.log('  2. Check database credentials in config/db.js');
        console.log('  3. Verify studio_db user exists and has privileges');
        console.log('  4. Try connecting with SQL Developer first');
        console.log('  5. Check if port 3000 is already in use');
        console.log('\n🔧 Quick fix:');
        console.log('  - Restart Oracle services');
        console.log('  - Recreate studio_db user');
        console.log('  - Check firewall settings for port 1521');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    await db.closePool();
    console.log('👋 Database connections closed');
    process.exit(0);
});

// Start the application
startServer();