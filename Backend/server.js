/**
 * server.js - Node.js REST API for Security Vulnerability Demo
 * ==============================================================
 * 
 * This server provides REST API endpoints that demonstrate
 * common web vulnerabilities and their fixes.
 * 
 * WARNING: This application contains INTENTIONALLY VULNERABLE code.
 *          DO NOT deploy this to production or any public server!
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');



// =============================================================================
// CONFIGURATION
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database path
const DB_PATH = process.env.DB_PATH 
    ? path.resolve(__dirname, process.env.DB_PATH)
    : path.join(__dirname, 'security_demo.db');

// Demo files directory for path traversal demo
const DEMO_FILES_DIR = process.env.DEMO_FILES_DIR
    ? path.resolve(__dirname, process.env.DEMO_FILES_DIR)
    : path.join(__dirname, 'demo_files');

// Frontend directory
const FRONTEND_DIR = path.join(__dirname, '..', 'Frontend');

let db = null;

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(FRONTEND_DIR));

// Rate limiter for brute force protection
const loginRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 1 minute.',
        rateLimited: true
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Initialize database
async function initDatabase() {
    const SQL = await initSqlJs();
    
    try {
        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(fileBuffer);
            console.log('[OK] Loaded existing database:', DB_PATH);
        } else {
            db = new SQL.Database();
            console.log('[INFO] Created new database (run init-db to populate)');
        }
    } catch (err) {
        console.error('[ERROR] Database initialization failed:', err.message);
        db = new SQL.Database();
    }
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function checkDbConnection(req, res, next) {
    if (!db) {
        return res.status(500).json({ 
            error: 'Database not initialized. Run "npm run init-db" first.' 
        });
    }
    next();
}

// Helper to convert sql.js results to array of objects
function queryToObjects(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}

// =============================================================================
// USER ROUTES - SQL INJECTION DEMO
// =============================================================================

/**
 * 🔴 VULNERABLE: SQL Injection Demo
 * POST /api/users/search-vulnerable
 */
app.post('/api/users/search-vulnerable', checkDbConnection, (req, res) => {
    const { search } = req.body;
    const searchTerm = search || '';
    
    try {
        // 🔴 DANGEROUS: String concatenation allows SQL injection!
        const query = `SELECT id, username, email FROM users WHERE username = '${searchTerm}'`;
        const queryExecuted = query;
        
        const result = db.exec(query);
        const users = queryToObjects(result);
        
        res.json({
            users: users,
            queryExecuted: queryExecuted,
            searchTerm: searchTerm
        });
    } catch (err) {
        res.status(500).json({ 
            error: err.message,
            queryExecuted: `SELECT * FROM users WHERE username = '${searchTerm}'`
        });
    }
});

/**
 * 🟢 SECURE: Parameterized Query with Exact Match
 * POST /api/users/search-secure
 */
app.post('/api/users/search-secure', checkDbConnection, (req, res) => {
    const { search } = req.body;
    const searchTerm = search || '';
    
    try {
        // 🟢 SECURE: Parameterized query with exact match
        // - Prevents SQL injection via parameterization
        // - Prevents enumeration via exact match (must know full username)
        const stmt = db.prepare('SELECT id, username, email FROM users WHERE username = ?');
        stmt.bind([searchTerm]);
        
        const users = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            users.push(row);
        }
        stmt.free();
        
        res.json({
            users: users,
            queryExecuted: 'SELECT * FROM users WHERE username = ? (parameterized)',
            searchTerm: searchTerm
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/users - Get all users (for admin purposes)
 */
app.get('/api/users', checkDbConnection, (req, res) => {
    try {
        const result = db.exec('SELECT id, username, email, is_admin, created_at FROM users');
        const users = queryToObjects(result);
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/users/:id - Get user by ID
 */
app.get('/api/users/:id', checkDbConnection, (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?');
        stmt.bind([parseInt(id)]);
        
        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();
            res.json({ user });
        } else {
            stmt.free();
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/users/:id/email - Get user email
 */
app.get('/api/users/:id/email', checkDbConnection, (req, res) => {
    const { id } = req.params;
    
    try {
        const stmt = db.prepare('SELECT email FROM users WHERE id = ?');
        stmt.bind([parseInt(id)]);
        
        if (stmt.step()) {
            const result = stmt.getAsObject();
            stmt.free();
            res.json({ email: result.email });
        } else {
            stmt.free();
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/users/:id/email - Update user email (CSRF demo)
 */
app.put('/api/users/:id/email', checkDbConnection, (req, res) => {
    const { id } = req.params;
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    try {
        db.run('UPDATE users SET email = ? WHERE id = ?', [email, parseInt(id)]);
        saveDatabase();
        
        res.json({ 
            message: `Email updated to: ${email}`,
            email: email
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// GUESTBOOK ROUTES - XSS DEMO
// =============================================================================

/**
 * GET /api/guestbook - Get all guestbook entries
 */
app.get('/api/guestbook', checkDbConnection, (req, res) => {
    try {
        const result = db.exec('SELECT * FROM guestbook ORDER BY created_at DESC');
        const entries = queryToObjects(result);
        res.json({ entries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/guestbook - Add new guestbook entry
 */
app.post('/api/guestbook', checkDbConnection, (req, res) => {
    const { name, message } = req.body;
    
    if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
    }
    
    try {
        db.run('INSERT INTO guestbook (name, message) VALUES (?, ?)', [name, message]);
        saveDatabase();
        
        res.status(201).json({ 
            message: 'Entry added!',
            id: db.exec('SELECT last_insert_rowid()')[0].values[0][0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/guestbook - Clear all guestbook entries
 */
app.delete('/api/guestbook', checkDbConnection, (req, res) => {
    try {
        db.run('DELETE FROM guestbook');
        saveDatabase();
        res.json({ message: 'Guestbook cleared!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// AUTH ROUTES - BRUTE FORCE DEMO
// =============================================================================

// In-memory attempt counter (for demo purposes)
const loginAttempts = {};

/**
 * POST /api/auth/login-vulnerable - Login without rate limiting
 */
app.post('/api/auth/login-vulnerable', checkDbConnection, (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Track attempts for display
    if (!loginAttempts[ip]) {
        loginAttempts[ip] = 0;
    }
    loginAttempts[ip]++;
    
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        stmt.bind([username]);
        
        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();
            
            if (bcrypt.compareSync(password, user.password_hash)) {
                loginAttempts[ip] = 0; // Reset on success
                return res.json({
                    success: true,
                    message: `Login successful! Welcome, ${username}!`,
                    attempts: loginAttempts[ip]
                });
            }
        } else {
            stmt.free();
        }
        
        // 🔴 VULNERABLE: No rate limiting, no lockout, no delay
        res.json({
            success: false,
            message: `Invalid credentials. Attempt #${loginAttempts[ip]} - No limits!`,
            attempts: loginAttempts[ip]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 🟢 SECURE: Login WITH rate limiting
 * POST /api/auth/login-secure
 */
app.post('/api/auth/login-secure', loginRateLimiter, checkDbConnection, (req, res) => {
    const { username, password } = req.body;
    
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        stmt.bind([username]);
        
        if (stmt.step()) {
            const user = stmt.getAsObject();
            stmt.free();
            
            if (bcrypt.compareSync(password, user.password_hash)) {
                return res.json({
                    success: true,
                    message: `Login successful! Welcome, ${username}!`
                });
            }
        } else {
            stmt.free();
        }
        
        // 🟢 SECURE: Rate limiter will block after 5 attempts
        res.json({
            success: false,
            message: 'Invalid credentials. Rate limit: 5 attempts per minute.'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/auth/attempts - Get current attempt count for IP
 */
app.get('/api/auth/attempts', (req, res) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    res.json({ attempts: loginAttempts[ip] || 0 });
});

// =============================================================================
// FILE ROUTES - PATH TRAVERSAL DEMO
// =============================================================================

/**
 * GET /api/files - List available demo files
 */
app.get('/api/files', (req, res) => {
    try {
        if (!fs.existsSync(DEMO_FILES_DIR)) {
            return res.json({ files: [] });
        }
        const files = fs.readdirSync(DEMO_FILES_DIR);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 🔴 VULNERABLE: Path Traversal Demo
 * GET /api/files/vulnerable?file=filename
 */
app.get('/api/files/vulnerable', (req, res) => {
    const filename = req.query.file || 'welcome.txt';
    
    try {
        // List available demo files
        let availableFiles = [];
        if (fs.existsSync(DEMO_FILES_DIR)) {
            availableFiles = fs.readdirSync(DEMO_FILES_DIR);
        }
        
        // 🔴 VULNERABLE: Direct path concatenation with user input!
        const filepath = path.join(DEMO_FILES_DIR, filename);
        
        if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
            const content = fs.readFileSync(filepath, 'utf-8');
            res.json({
                filename: filename,
                content: content,
                availableFiles: availableFiles
            });
        } else {
            res.status(404).json({
                error: `File not found: ${filename}`,
                availableFiles: availableFiles
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 🟢 SECURE: Path Traversal Prevention Demo
 * GET /api/files/secure?file=filename
 */
app.get('/api/files/secure', (req, res) => {
    const filename = req.query.file || 'welcome.txt';
    
    // SECURE: Allowlist of permitted files
    const allowedFiles = ['report.txt', 'welcome.txt', 'data.csv'];
    
    try {
        // 🟢 SECURE: Use path.basename to get only the filename #1
        const safeFilename = path.basename(filename);
        
        // 🟢 SECURE: Check against allowlist #2
        if (!allowedFiles.includes(safeFilename)) {
            return res.status(403).json({
                error: `Access denied. File '${filename}' is not in the allowed list.`,
                availableFiles: allowedFiles
            });
        }
        
        // SECURE: Build path and verify it's within allowed directory
        const basePath = path.resolve(DEMO_FILES_DIR);
        const filepath = path.resolve(path.join(DEMO_FILES_DIR, safeFilename));
        
        // 🟢 Verify the final path is still within the allowed directory #3
        if (!filepath.startsWith(basePath)) {
            return res.status(403).json({
                error: 'Access denied. Path traversal attempt detected!',
                availableFiles: allowedFiles
            });
        }
        
        if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
            const content = fs.readFileSync(filepath, 'utf-8');
            res.json({
                filename: safeFilename,
                content: content,
                availableFiles: allowedFiles
            });
        } else {
            res.status(404).json({
                error: `File not found: ${safeFilename}`,
                availableFiles: allowedFiles
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// DATABASE RESET ROUTE
// =============================================================================

/**
 * POST /api/reset-db - Reset database to initial state
 */
app.post('/api/reset-db', async (req, res) => {
    try {
        // Re-run init script
        const { initDatabase: reinitDb } = require('./init-db');
        await reinitDb();
        
        // Reload the database
        const SQL = await initSqlJs();
        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(fileBuffer);
        }
        
        res.json({ message: 'Database reset to initial state!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        database: db ? 'connected' : 'disconnected'
    });
});

// =============================================================================
// SPA FALLBACK
// =============================================================================

// Serve index.html for any non-API routes (SPA fallback)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    }
});

// =============================================================================
// START SERVER
// =============================================================================

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log('Security Demo Lab - Full Stack Application');
        console.log('='.repeat(60));
        console.log(`[OK] Environment: ${NODE_ENV}`);
        console.log(`[OK] Server: http://localhost:${PORT}`);
        console.log(`[OK] API: http://localhost:${PORT}/api`);
        console.log(`[OK] Database: ${DB_PATH}`);
        console.log('='.repeat(60));
        console.log('[!] WARNING: This app contains INTENTIONALLY VULNERABLE code!');
        console.log('    Do NOT deploy to production or public servers!');
        console.log('='.repeat(60));
    });
});

module.exports = app;
