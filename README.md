# 🔒 Security Vulnerability Demo Lab

An educational web application demonstrating common web security vulnerabilities and their fixes. Built with **Node.js/Express** backend and **vanilla JavaScript** frontend.

> ⚠️ **WARNING**: This application contains **INTENTIONALLY VULNERABLE** code for educational purposes. **DO NOT** deploy to production or any public server!

## 📁 Project Structure

```
security-demo-lab/
├── backend/                    # Node.js REST API
│   ├── server.js              # Express server with API endpoints
│   ├── init-db.js             # Database initialization script
│   ├── package.json           # Node.js dependencies
│   ├── demo_files/            # Files for path traversal demo
│   │   ├── welcome.txt
│   │   ├── report.txt
│   │   └── data.csv
│   ├── sensitive_config.txt   # Sensitive file (for demo)
│   └── security_demo.db       # SQLite database
│
├── Frontend/                   # Static frontend files
│   ├── index.html             # Dashboard/home page
│   ├── sqli.html              # SQL Injection demo
│   ├── xss.html               # Cross-Site Scripting demo
│   ├── csrf.html              # CSRF Attack demo
│   ├── bruteforce.html        # Brute Force demo
│   ├── pathtraversal.html     # Path Traversal demo
│   ├── dos.html               # DoS/ReDoS demo
│   ├── css/
│   │   └── styles.css         # Application styles
│   └── js/
│       └── app.js             # Frontend JavaScript (Axios API calls)
│
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher

### Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Initialize the database
npm run init-db

# 4. Start the server
npm start
```

### Access the Application

Open your browser and navigate to: **http://localhost:3001**

## 🎯 Vulnerability Demos

| Demo | Vulnerable | Secure | Description |
|------|------------|--------|-------------|
| **SQL Injection** | User input concatenated into SQL | Parameterized queries | Database manipulation via malicious input |
| **XSS** | Raw HTML rendering | HTML entity escaping | Script injection in guestbook |
| **CSRF** | No token validation | CSRF tokens | Forged requests from malicious sites |
| **Brute Force** | No rate limiting | Rate limiting | Unlimited login attempts |
| **Path Traversal** | Direct file path access | Allowlist + path validation | Reading sensitive files |
| **ReDoS** | Vulnerable regex pattern | Safe regex + input limits | Denial of service via regex |

## 🔑 Demo Credentials

| User | Password | Role |
|------|----------|------|
| `admin` | `admin` | Administrator |
| `john_doe` | `password123` | Regular User |

## 📡 API Endpoints

### Users (SQL Injection Demo)
- `POST /api/users/search-vulnerable` - Vulnerable search
- `POST /api/users/search-secure` - Secure search
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID

### Guestbook (XSS Demo)
- `GET /api/guestbook` - Get all entries
- `POST /api/guestbook` - Add entry
- `DELETE /api/guestbook` - Clear all entries

### Auth (Brute Force Demo)
- `POST /api/auth/login-vulnerable` - Login without rate limiting
- `POST /api/auth/login-secure` - Login with rate limiting
- `GET /api/auth/attempts` - Get attempt count

### Files (Path Traversal Demo)
- `GET /api/files` - List available files
- `GET /api/files/vulnerable?file=` - Vulnerable file reader
- `GET /api/files/secure?file=` - Secure file reader

### Utility
- `GET /api/health` - Health check
- `POST /api/reset-db` - Reset database to initial state

## 🛠️ Development

### Available Scripts

```bash
npm start      # Start the server
npm run init-db # Initialize/reset the database
npm test       # Run automated tests (if available)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |

## 📚 Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## 📄 License

Educational use only. Not licensed for production deployment.

---

**Made for security education and awareness training.**
