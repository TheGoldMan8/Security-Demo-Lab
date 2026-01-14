/**
 * app.js - Main JavaScript Application for Security Demo
 * ========================================================
 * Uses Axios for API communication with the Node.js backend
 */

// API Base URL
const API_BASE_URL = '/api';

// Axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// =============================================================================
// REQUEST LOGGER - Live HTTP Request Display
// =============================================================================

// Store for logged requests
const requestLog = [];
const MAX_LOG_ENTRIES = 20;

// Add request interceptor
api.interceptors.request.use(
    (config) => {
        config.metadata = { startTime: Date.now() };
        logRequest('REQUEST', config.method.toUpperCase(), config.url, config.data);
        return config;
    },
    (error) => {
        logRequest('ERROR', 'REQUEST', '', error.message);
        return Promise.reject(error);
    }
);

// Add response interceptor
api.interceptors.response.use(
    (response) => {
        const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
        logResponse('RESPONSE', response.status, response.config.url, response.data, duration);
        return response;
    },
    (error) => {
        const duration = Date.now() - (error.config?.metadata?.startTime || Date.now());
        logResponse('ERROR', error.response?.status || 0, error.config?.url || '', error.message, duration);
        return Promise.reject(error);
    }
);

/**
 * Log a request to the request log
 */
function logRequest(type, method, url, body) {
    const entry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: type,
        method: method,
        url: url,
        body: body ? JSON.stringify(body, null, 2) : null,
        direction: 'out'
    };
    requestLog.unshift(entry);
    if (requestLog.length > MAX_LOG_ENTRIES) requestLog.pop();
    renderRequestLog();
}

/**
 * Log a response to the request log
 */
function logResponse(type, status, url, data, duration) {
    const entry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: type,
        status: status,
        url: url,
        data: data ? JSON.stringify(data, null, 2) : null,
        duration: duration,
        direction: 'in'
    };
    requestLog.unshift(entry);
    if (requestLog.length > MAX_LOG_ENTRIES) requestLog.pop();
    renderRequestLog();
}

/**
 * Render the request log to the page
 */
function renderRequestLog() {
    const container = document.getElementById('request-log');
    if (!container) return;
    
    if (requestLog.length === 0) {
        container.innerHTML = '<div class="text-muted small text-center py-3">No requests yet...</div>';
        return;
    }
    
    let html = '';
    requestLog.forEach(entry => {
        const isRequest = entry.direction === 'out';
        const iconClass = isRequest ? 'bi-arrow-up-circle text-warning' : 'bi-arrow-down-circle text-info';
        const statusBadge = entry.status 
            ? `<span class="badge ${entry.status >= 200 && entry.status < 300 ? 'bg-success' : 'bg-danger'}">${entry.status}</span>` 
            : '';
        const durationText = entry.duration ? `<span class="text-muted">${entry.duration}ms</span>` : '';
        
        html += `
            <div class="request-log-entry ${isRequest ? 'request-out' : 'request-in'}">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi ${iconClass}"></i>
                    <span class="badge bg-secondary">${entry.method || 'RES'}</span>
                    <code class="small flex-grow-1 text-truncate">${entry.url || ''}</code>
                    ${statusBadge}
                    ${durationText}
                    <span class="text-muted small">${entry.time}</span>
                </div>
                ${entry.body || entry.data ? `<pre class="request-log-body mb-0">${escapeHtml(entry.body || entry.data)}</pre>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Clear the request log
 */
function clearRequestLog() {
    requestLog.length = 0;
    renderRequestLog();
}

/**
 * Initialize the request logger panel on the page
 * Call this function to add a live request viewer to any demo page
 */
function initRequestLogger(targetSelector = '.container') {
    // Create a wrapper div to hold the logger in a container
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'container mb-4';
    
    // Create the request logger panel
    const loggerDiv = document.createElement('div');
    loggerDiv.className = 'request-logger';
    loggerDiv.innerHTML = `
        <div class="request-logger-header">
            <h6><span class="live-indicator"></span> Live HTTP Requests</h6>
            <button class="btn btn-sm btn-outline-secondary" onclick="clearRequestLog()">
                <i class="bi bi-trash"></i> Clear
            </button>
        </div>
        <div id="request-log">
            <div class="text-muted small text-center py-3">No requests yet... Interact with the page to see live requests.</div>
        </div>
    `;
    
    wrapperDiv.appendChild(loggerDiv);
    
    // Insert before the footer (at the bottom of the page)
    const footer = document.querySelector('footer');
    if (footer) {
        footer.parentNode.insertBefore(wrapperDiv, footer);
    } else {
        // Fallback: append to body
        document.body.appendChild(wrapperDiv);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get URL parameter value
 */
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Check if in vulnerable mode
 */
function isVulnerableMode() {
    return getUrlParam('mode') === 'vulnerable';
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text, button) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showCopySuccess(button))
            .catch(() => fallbackCopy(text, button));
    } else {
        // Fallback for older browsers or insecure contexts
        fallbackCopy(text, button);
    }
}

/**
 * Fallback copy method using execCommand
 */
function fallbackCopy(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(button);
        } else {
            showCopyError(button);
        }
    } catch (err) {
        showCopyError(button);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Show copy success feedback
 */
function showCopySuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check"></i> Copied!';
    button.classList.add('btn-success');
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('btn-success');
    }, 2000);
}

/**
 * Show copy error feedback
 */
function showCopyError(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="bi bi-x"></i> Failed';
    button.classList.add('btn-danger');
    setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('btn-danger');
    }, 2000);
}





/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div'); // Create a temporary DOM element
    div.textContent = text; // The browser treats the string as plain text, not HTML (input sanitization)
    return div.innerHTML; // returns the content with all special characters converted to HTML entities. (e.g.: < turns into  &lt; and " turns into &quot;)
}





/**
 * Reset database
 */
async function resetDatabase() {
    try {
        const response = await api.post('/reset-db');
        showAlert('Database reset to initial state', 'success');
    } catch (error) {
        showAlert('Error resetting database: ' + error.message, 'danger');
    }
}

// =============================================================================
// SQL INJECTION DEMO
// =============================================================================

async function searchUsers(searchTerm, isVulnerable) {
    const endpoint = isVulnerable ? '/users/search-vulnerable' : '/users/search-secure';
    
    try {
        const response = await api.post(endpoint, { search: searchTerm });
        return response.data;
    } catch (error) {
        return { 
            error: error.response?.data?.error || error.message,
            queryExecuted: error.response?.data?.queryExecuted || ''
        };
    }
}

function renderSQLiResults(data, searchTerm, isVulnerable) {
    const queryDisplay = document.getElementById('query-executed');
    const resultsContainer = document.getElementById('results-container');
    
    if (queryDisplay) {
        queryDisplay.textContent = data.queryExecuted || '';
        queryDisplay.className = isVulnerable ? '' : 'text-success';
    }
    
    if (!resultsContainer) return;
    
    if (data.error) {
        resultsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle me-2"></i>
                Error: ${escapeHtml(data.error)}
            </div>
        `;
        return;
    }
    
    const users = data.users || [];
    
    if (users.length === 0) {
        resultsContainer.innerHTML = `
            <div class="alert alert-info mt-4">
                <i class="bi bi-info-circle me-2"></i>
                No users found matching "${escapeHtml(searchTerm)}"
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="mt-4">
            <h6 class="fw-bold mb-3">
                <i class="bi bi-table me-1"></i> Results (${users.length} users found):
            </h6>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${escapeHtml(String(user.id))}</td>
                <td><code>${escapeHtml(user.username)}</code></td>
                <td>${escapeHtml(user.email)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
}

// =============================================================================
// XSS DEMO (GUESTBOOK)
// =============================================================================

async function loadGuestbookEntries() {
    try {
        console.log('[DEBUG] Loading guestbook entries...');
        const response = await api.get('/guestbook');
        console.log('[DEBUG] Guestbook response:', response.data);
        return response.data.entries || [];
    } catch (error) {
        console.error('[ERROR] Failed to load guestbook:', error);
        showAlert('Error loading guestbook: ' + error.message, 'danger');
        return [];
    }
}

async function addGuestbookEntry(name, message) {
    try {
        const response = await api.post('/guestbook', { name, message });
        return { success: true, message: response.data.message };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
}

async function clearGuestbook() {
    try {
        await api.delete('/guestbook');
        showAlert('Guestbook cleared!', 'info');
        return true;
    } catch (error) {
        showAlert('Error clearing guestbook: ' + error.message, 'danger');
        return false;
    }
}

function renderGuestbookEntries(entries, isVulnerable) {
    const container = document.getElementById('entries-container');
    if (!container) return;
    
    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-inbox fs-1"></i>
                <p class="mt-2 mb-0">No entries yet. Be the first to sign!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    entries.forEach(entry => {
        const name = isVulnerable ? entry.name : escapeHtml(entry.name);
        const message = isVulnerable ? entry.message : escapeHtml(entry.message);
        
        html += `
            <div class="guestbook-entry">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="author">${name}</span>
                    <span class="timestamp">${escapeHtml(entry.created_at || '')}</span>
                </div>
                <div class="message">${message}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// =============================================================================
// CSRF DEMO
// =============================================================================

async function getUserEmail(userId = 1) {
    try {
        const response = await api.get(`/users/${userId}/email`);
        return response.data.email;
    } catch (error) {
        return 'admin@company.com';
    }
}

async function updateUserEmail(userId, newEmail) {
    try {
        const response = await api.put(`/users/${userId}/email`, { email: newEmail });
        return { success: true, message: response.data.message, email: response.data.email };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
}

// =============================================================================
// BRUTE FORCE DEMO
// =============================================================================

async function attemptLogin(username, password, isVulnerable) {
    const endpoint = isVulnerable ? '/auth/login-vulnerable' : '/auth/login-secure';
    
    try {
        const response = await api.post(endpoint, { username, password });
        return response.data;
    } catch (error) {
        if (error.response?.status === 429) {
            return { 
                success: false, 
                message: 'Rate limit exceeded! Too many attempts.',
                rateLimited: true
            };
        }
        return { success: false, error: error.response?.data?.error || error.message };
    }
}

async function getAttemptCount() {
    try {
        const response = await api.get('/auth/attempts');
        return response.data.attempts || 0;
    } catch (error) {
        return 0;
    }
}

// =============================================================================
// PATH TRAVERSAL DEMO
// =============================================================================

async function readFile(filename, isVulnerable) {
    const endpoint = isVulnerable ? '/files/vulnerable' : '/files/secure';
    
    try {
        const response = await api.get(endpoint, { params: { file: filename } });
        return response.data;
    } catch (error) {
        return { 
            error: error.response?.data?.error || error.message,
            availableFiles: error.response?.data?.availableFiles || []
        };
    }
}

function renderFileContent(data, filename) {
    const contentContainer = document.getElementById('file-content');
    const errorContainer = document.getElementById('file-error');
    const filesContainer = document.getElementById('available-files');
    
    if (errorContainer) {
        if (data.error) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle me-2"></i>
                    ${escapeHtml(data.error)}
                </div>
            `;
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }
    
    if (contentContainer) {
        if (data.content) {
            contentContainer.innerHTML = `
                <div>
                    <h6 class="text-muted mb-2">
                        <i class="bi bi-file-code me-1"></i>
                        Content of: <code>${escapeHtml(filename)}</code>
                    </h6>
                    <pre style="max-height: 400px; overflow-y: auto;">${escapeHtml(data.content)}</pre>
                </div>
            `;
            contentContainer.style.display = 'block';
        } else {
            contentContainer.style.display = 'none';
        }
    }
    
    if (filesContainer && data.availableFiles) {
        let html = '';
        data.availableFiles.forEach(file => {
            const mode = isVulnerableMode() ? 'vulnerable' : 'secure';
            html += `
                <li>
                    <i class="bi bi-file-earmark-text"></i>
                    <a href="?mode=${mode}&file=${encodeURIComponent(file)}">${escapeHtml(file)}</a>
                </li>
            `;
        });
        filesContainer.innerHTML = html;
    }
}

// =============================================================================
// DOS DEMO (ReDoS)
// =============================================================================

function analyzePattern(text, isVulnerable) {
    // 🔴 VULNERABLE: Dangerous regex with nested quantifiers
    // 🟢 SECURE: Safe regex without nested quantifiers
    const pattern = isVulnerable ? /(a+)+b/ : /a+b/;
    
    const startTime = performance.now();
    let result = null;
    let error = null;
    
    try {
        const match = text.match(pattern);
        if (match) {
            result = `Pattern matched at position ${match.index}`;
        } else {
            result = "No match found";
        }
    } catch (e) {
        error = e.message;
    }
    
    const processingTime = (performance.now() - startTime) / 1000; // Convert to seconds
    
    return { result, error, processingTime };
}

function renderDosResult(data) {
    const resultContainer = document.getElementById('dos-result');
    if (!resultContainer) return;
    
    let html = '';
    
    if (data.error) {
        html += `
            <div class="alert alert-danger mt-4">
                <i class="bi bi-x-circle me-2"></i>
                ${escapeHtml(data.error)}
            </div>
        `;
    }
    
    if (data.result) {
        html += `
            <div class="alert alert-info mt-4">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Result:</strong> ${escapeHtml(data.result)}
            </div>
        `;
    }
    
    if (data.processingTime !== undefined) {
        const timeClass = data.processingTime > 1 ? 'bg-danger' : 
                         data.processingTime > 0.1 ? 'bg-warning' : 'bg-success';
        const textClass = data.processingTime > 1 ? 'text-danger' : 
                         data.processingTime > 0.1 ? 'text-warning' : 'text-success';
        
        html += `
            <div class="mt-4 p-3 rounded ${timeClass} bg-opacity-10">
                <h6 class="mb-2">
                    <i class="bi bi-stopwatch me-1"></i>
                    Processing Time
                </h6>
                <p class="mb-0">
                    <span class="fs-3 fw-bold ${textClass}">
                        ${data.processingTime.toFixed(6)}
                    </span>
                    <span class="text-muted">seconds</span>
                </p>
                ${data.processingTime > 1 ? `
                    <p class="text-danger mb-0 mt-2 small">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        Slow processing indicates potential ReDoS vulnerability!
                    </p>
                ` : ''}
            </div>
        `;
    }
    
    resultContainer.innerHTML = html;
}

// =============================================================================
// PAGE INITIALIZATION
// =============================================================================

// Make functions available globally
window.copyToClipboard = copyToClipboard;
window.resetDatabase = resetDatabase;
window.searchUsers = searchUsers;
window.renderSQLiResults = renderSQLiResults;
window.loadGuestbookEntries = loadGuestbookEntries;
window.addGuestbookEntry = addGuestbookEntry;
window.clearGuestbook = clearGuestbook;
window.renderGuestbookEntries = renderGuestbookEntries;
window.getUserEmail = getUserEmail;
window.updateUserEmail = updateUserEmail;
window.attemptLogin = attemptLogin;
window.getAttemptCount = getAttemptCount;
window.readFile = readFile;
window.renderFileContent = renderFileContent;
window.analyzePattern = analyzePattern;
window.renderDosResult = renderDosResult;
window.isVulnerableMode = isVulnerableMode;
window.getUrlParam = getUrlParam;
window.showAlert = showAlert;
window.escapeHtml = escapeHtml;
window.api = api;

