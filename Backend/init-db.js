/**
 * init-db.js - Database Initialization Script
 * =============================================
 * 
 * This script creates the SQLite database and populates it with
 * demo data for the security vulnerability demonstrations.
 * 
 * Run this script before starting the application:
 *     npm run init-db
 */

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'security_demo.db');
const DEMO_FILES_DIR = path.join(__dirname, 'demo_files');

async function initDatabase() {
    console.log('Initializing SQL.js...');
    const SQL = await initSqlJs();
    
    // Create new database
    const db = new SQL.Database();
    console.log('[OK] Created new database');
    
    // =========================================================================
    // CREATE TABLES
    // =========================================================================
    
    // Users table - for SQL injection and auth demos
    db.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("[OK] Created 'users' table");
    
    // Guestbook table - for XSS demo
    db.run(`
        CREATE TABLE guestbook (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("[OK] Created 'guestbook' table");
    
    // Login attempts table - for tracking brute force
    db.run(`
        CREATE TABLE login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            username TEXT NOT NULL,
            success INTEGER DEFAULT 0,
            attempted_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("[OK] Created 'login_attempts' table");
    
    // =========================================================================
    // SEED DATA
    // =========================================================================
    
    // Demo users with various roles
    const demoUsers = [
        { username: 'admin', email: 'admin@company.com', password: 'admin', isAdmin: 1 },
        { username: 'john_doe', email: 'john@example.com', password: 'password123', isAdmin: 0 },
        { username: 'jane_smith', email: 'jane@example.com', password: 'letmein', isAdmin: 0 },
        { username: 'bob_wilson', email: 'bob@example.com', password: 'qwerty', isAdmin: 0 },
        { username: 'alice_jones', email: 'alice@example.com', password: 'abc123', isAdmin: 0 },
        { username: 'charlie_brown', email: 'charlie@example.com', password: 'password', isAdmin: 0 },
        { username: 'secret_user', email: 'secret@company.com', password: 'topsecret', isAdmin: 1 },
    ];
    
    for (const user of demoUsers) {
        const passwordHash = bcrypt.hashSync(user.password, 10);
        db.run(
            'INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
            [user.username, user.email, passwordHash, user.isAdmin]
        );
    }
    console.log(`[OK] Added ${demoUsers.length} demo users`);
    
    // Demo guestbook entries
    const demoEntries = [
        { name: 'Alice', message: 'Great website! Love the security features.' },
        { name: 'Bob', message: 'Very informative presentation.' },
        { name: 'Carol', message: 'Learning a lot about web security!' },
    ];
    
    for (const entry of demoEntries) {
        db.run(
            'INSERT INTO guestbook (name, message) VALUES (?, ?)',
            [entry.name, entry.message]
        );
    }
    console.log(`[OK] Added ${demoEntries.length} guestbook entries`);
    
    // Save database to file
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log(`\n[SUCCESS] Database saved to: ${DB_PATH}`);
    
    db.close();
    
    // =========================================================================
    // CREATE DEMO FILES FOR PATH TRAVERSAL DEMO
    // =========================================================================
    
    createDemoFiles();
    
    return true;
}

function createDemoFiles() {
    // Create demo files directory
    if (!fs.existsSync(DEMO_FILES_DIR)) {
        fs.mkdirSync(DEMO_FILES_DIR, { recursive: true });
    }
    
    // Create allowed demo files
    const demoFiles = {
        'report.txt': `=================================
QUARTERLY SALES REPORT - Q4 2024
=================================

Total Revenue: $1,234,567.89
Total Orders: 5,432
Average Order Value: $227.23

Top Products:
1. Widget Pro - 1,200 units
2. Gadget Plus - 890 units
3. Super Tool - 654 units

Report generated on 2024-12-01
=================================`,
        
        'welcome.txt': `Welcome to the Security Demo Application!

This file is part of the Path Traversal demonstration.
You should only be able to access files within this directory.

Try to access files outside this directory to see the vulnerability!`,
        
        'data.csv': `id,product,price,quantity
1,Widget Pro,49.99,100
2,Gadget Plus,79.99,50
3,Super Tool,29.99,200
4,Mega Device,149.99,25
5,Ultra Kit,199.99,10`,
    };
    
    for (const [filename, content] of Object.entries(demoFiles)) {
        const filepath = path.join(DEMO_FILES_DIR, filename);
        fs.writeFileSync(filepath, content, 'utf-8');
        console.log(`[OK] Created demo file: ${filepath}`);
    }
    
    // Create a "sensitive" file outside the demo directory
    const sensitiveFile = path.join(__dirname, 'sensitive_config.txt');
    fs.writeFileSync(sensitiveFile, `=================================
!! SENSITIVE CONFIGURATION FILE !!
=================================

DATABASE_PASSWORD=super_secret_password_123
API_KEY=sk-1234567890abcdef
ADMIN_TOKEN=admin_bearer_token_xyz
AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE

This file should NEVER be accessible to users!
If you can see this, the path traversal attack worked!
=================================`, 'utf-8');
    console.log(`[OK] Created sensitive file: ${sensitiveFile}`);
    
    console.log('\n[SUCCESS] Demo files created!');
}

// Run if called directly
if (require.main === module) {
    console.log('='.repeat(50));
    console.log('Security Demo - Database Initialization');
    console.log('='.repeat(50));
    console.log();
    
    initDatabase().then(() => {
        console.log();
        console.log('='.repeat(50));
        console.log('Demo Credentials:');
        console.log('-'.repeat(50));
        console.log('Admin User:  admin / admin');
        console.log('Regular User: john_doe / password123');
        console.log('='.repeat(50));
    }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}

module.exports = { initDatabase, createDemoFiles };
