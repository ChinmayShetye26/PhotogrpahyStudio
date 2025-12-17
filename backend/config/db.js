// ============================================
// DATABASE CONNECTION CONFIGURATION
// ============================================

const oracledb = require('oracledb');
require('dotenv').config();

// Database configuration from environment variables
const dbConfig = {
    user: process.env.DB_USER || 'studio_db',
    password: process.env.DB_PASSWORD || 'password123',
    connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1'
};

// Connection pool for better performance
let pool;

/**
 * Initialize database connection pool
 */
async function initialize() {
    try {
        console.log('Initializing database connection...');
        
        // Create connection pool
        pool = await oracledb.createPool({
            ...dbConfig,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 2,
            poolTimeout: 60,
            queueTimeout: 60000,
            poolPingInterval: 60
        });
        
        console.log('✅ Database connection pool created successfully');
        console.log(`📊 Database: ${dbConfig.user}@${dbConfig.connectString}`);
        
        return pool;
    } catch (err) {
        console.error('❌ Error creating connection pool:', err.message);
        console.log('💡 Troubleshooting tips:');
        console.log('1. Check if Oracle Database is running');
        console.log('2. Verify connection string in .env file');
        console.log('3. Check if studio_db user exists');
        console.log('4. Try connecting with SQL Developer first');
        throw err;
    }
}

/**
 * Execute SQL query
 * @param {string} sql - SQL query
 * @param {Array} binds - Query parameters
 * @param {Object} options - Query options
 * @returns {Array} Query results
 */
async function executeQuery(sql, binds = [], options = {}) {
    let connection;
    try {
        // Get connection from pool
        connection = await pool.getConnection();
        
        // Execute query
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
            ...options
        });
        
        return result.rows || [];
    } catch (err) {
        console.error('❌ Error executing query:', err.message);
        console.error('📝 Query:', sql);
        console.error('🔧 Parameters:', binds);
        throw err;
    } finally {
        // Always release connection back to pool
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('❌ Error closing connection:', err.message);
            }
        }
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const result = await executeQuery('SELECT 1 FROM DUAL');
        console.log('✅ Database connection test successful');
        return true;
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
        return false;
    }
}

/**
 * Close connection pool (call when shutting down)
 */
async function closePool() {
    try {
        if (pool) {
            await pool.close();
            console.log('Database connection pool closed');
        }
    } catch (err) {
        console.error('Error closing connection pool:', err.message);
    }
}

// Export functions
module.exports = {
    initialize,
    executeQuery,
    testConnection,
    closePool,
    dbConfig
};