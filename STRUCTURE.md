# Project Structure & File Guide

## Directory Layout

```
devicecode/
│
├── README.md                           # Main documentation
├── TROUBLESHOOTING.md                  # Troubleshooting guide
├── package.json                        # Dependencies and scripts
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore file
│
├── quick-start.sh                      # Quick start script (Mac/Linux)
├── quick-start.bat                     # Quick start script (Windows)
│
│
├── tv-streaming-app/                   # Device Client Application
│   ├── server.js                       # Main server (Express)
│   ├── views/
│   │   └── index.ejs                   # Main UI with forms
│   └── public/                         # Static files (optional)
│
│
├── identity-verification-app/          # Identity Verification Server
│   ├── server.js                       # Main server (Express)
│   └── views/
│       ├── login.ejs                   # Login page
│       ├── dashboard.ejs               # Admin dashboard
│       ├── device-verify.ejs           # Device code verification
│       └── ciba-verify.ejs             # CIBA request verification
│
│
└── docs/                               # Documentation
    ├── API.md                          # API Documentation
    ├── ARCHITECTURE.md                 # Architecture documentation
    └── INTEGRATION_GUIDE.md            # Ping Federate integration guide
```

## File Descriptions

### Root Files

#### **README.md**
Complete project documentation including:
- Project overview
- Installation instructions
- Usage guide for both flows
- API endpoint summary
- Configuration with Ping Federate
- Security considerations
- References and troubleshooting

#### **TROUBLESHOOTING.md**
Comprehensive troubleshooting guide with:
- Common issues and solutions
- Port conflict resolution
- Connection troubleshooting
- Authentication flow issues
- Browser/session issues
- Performance optimization
- Quick reference section

#### **package.json**
Node.js project configuration:
```json
{
  "scripts": {
    "start:tv": "node tv-streaming-app/server.js",
    "start:identity": "node identity-verification-app/server.js",
    "dev": "npm-run-all --parallel dev:tv dev:identity"
  },
  "dependencies": [
    "express",
    "axios",
    "express-session",
    "ejs",
    "body-parser",
    "dotenv"
  ]
}
```

#### **.env.example**
Template for environment configuration:
```
PF_BASE_URL=https://pingfederate.example.com
TV_CLIENT_ID=tv-app-client
TV_CLIENT_SECRET=your-secret
...
```

Copy to `.env` and fill with actual values.

#### **.gitignore**
Prevents committing:
- `node_modules/`
- `.env`
- `logs/`
- `.DS_Store`
- `*.log`

#### **quick-start.sh & quick-start.bat**
Automated setup scripts for Mac/Linux and Windows respectively.

---

### TV Streaming App (`tv-streaming-app/`)

#### **server.js** (~500 lines)
Main Express server for TV streaming app.

**Key Sections**:
1. **Configuration** (Lines 1-30)
   - Ping Federate URLs
   - Client credentials

2. **Middleware** (Lines 32-50)
   - Body parser
   - Session management
   - EJS template engine

3. **Routes** (Lines 52-300)
   - `GET /` - Home page
   - `POST /device-code/request` - Request device code
   - `POST /ciba/request` - Request CIBA
   - `GET /status` - Get status
   - `GET /userinfo` - Get user info
   - `POST /logout` - Logout

4. **Device Code Polling** (Lines 115-165)
   - `startDeviceCodePolling()` function
   - Polls every 5 seconds
   - Handles authorization_pending, slow_down, expired_token

5. **CIBA Polling** (Lines 195-245)
   - `startCIBAPolling()` function
   - Polls every 2 seconds
   - Completes on approval/denial

#### **views/index.ejs** (~550 lines)
HTML/CSS/JavaScript UI for TV app.

**Sections**:
1. **Styling** (Lines 1-200)
   - Responsive grid layout
   - Gradient backgrounds
   - Card-based design

2. **Device Code Section** (Lines 200-250)
   - Request button
   - User code display
   - Verification URI
   - Timer display

3. **CIBA Section** (Lines 250-300)
   - Phone number input
   - Send authentication button
   - Request status tracking

4. **Status Dashboard** (Lines 300-350)
   - Authentication status
   - Active flow indicator
   - Token information
   - User info button

5. **JavaScript** (Lines 400-600)
   - `requestDeviceCode()` - Fetch device code
   - `requestCIBA()` - Send CIBA request
   - `startStatusCheck()` - Poll status
   - Auto-refresh every 2 seconds

---

### Identity Verification App (`identity-verification-app/`)

#### **server.js** (~600 lines)
Admin portal backend.

**Key Sections**:
1. **Configuration** (Lines 1-30)
   - Ping Federate settings
   - Admin API keys

2. **In-Memory Storage** (Lines 35-50)
   - `deviceCodeRequests` Map
   - `cibaRequests` Map
   - `users` Map with credentials

3. **Authentication Middleware** (Lines 70-80)
   - `requireAuth()` function
   - Session validation

4. **Routes** (Lines 85-400)
   - `GET /login` - Login form
   - `POST /login` - Authenticate
   - `GET /dashboard` - Admin dashboard
   - `GET /api/device-codes/pending` - Get pending
   - `POST /api/device-codes/:id/approve` - Approve
   - `POST /api/device-codes/:id/deny` - Deny
   - `GET /api/ciba/pending` - Get CIBA pending
   - `POST /api/ciba/:id/approve` - Approve CIBA
   - `POST /api/ciba/:id/deny` - Deny CIBA

5. **Webhooks** (Lines 350-400)
   - `POST /webhooks/device-code` - Receive device code notifications
   - `POST /webhooks/ciba` - Receive CIBA notifications

6. **Utility Functions** (Lines 500-550)
   - `notifyPingFederateOfApproval()` - Send approval to PF
   - `notifyPingFederateOfCIBAApproval()` - Send CIBA approval

#### **views/login.ejs** (~200 lines)
Admin login page.

**Features**:
- Login form
- Error messages
- Demo credentials display
- Responsive design

#### **views/dashboard.ejs** (~300 lines)
Admin dashboard showing pending requests.

**Sections**:
1. **Navigation Bar**
   - Title and branding
   - Logged-in user display
   - Logout button

2. **Statistics Cards**
   - Pending device codes count
   - Pending CIBA requests count
   - Total pending approvals

3. **Device Code Requests Section**
   - Lista of pending device codes
   - Click to access verification page
   - Auto-refresh every 5 seconds

4. **CIBA Requests Section**
   - List of pending CIBA requests
   - Phone numbers displayed
   - Auto-refresh

5. **JavaScript**
   - `loadDeviceCodes()` - Fetch and display
   - `loadCIBA()` - Fetch and display
   - Auto-refresh timer

#### **views/device-verify.ejs** (~250 lines)
Device code verification/approval page.

**Content**:
- Device code display
- Client information
- Scope requested
- Request timing details
- Approve button
- Deny button with reason

#### **views/ciba-verify.ejs** (~250 lines)
CIBA request verification/approval page.

**Content**:
- Phone number display
- Auth request ID
- Client information
- Binding message
- Approve button
- Deny button

---

### Documentation (`docs/`)

#### **API.md** (~600 lines)
Complete API reference.

**Covers**:
- Base URLs for both apps
- All endpoints with methods
- Request/response examples
- Error responses
- HTTP status codes
- Example workflows
- Rate limiting notes

#### **ARCHITECTURE.md** (~800 lines)
System architecture documentation.

**Includes**:
- High-level architecture diagram
- Component details
- Request/response sequences
- Data models
- In-memory storage structures
- Polling mechanisms
- Security considerations
- Scalability analysis

#### **INTEGRATION_GUIDE.md** (~700 lines)
Step-by-step Ping Federate integration.

**Covers**:
- Prerequisites
- OAuth 2.0 setup
- Device authorization grant configuration
- CIBA configuration
- Scope configuration
- Webhook setup
- Production hardening
- Troubleshooting PF-specific issues
- API key management

---

## File Dependencies

### Package.json Dependencies
```
express@4.18.2       - Web framework
axios@1.6.0          - HTTP client
express-session@1.17.3 - Session management
ejs@3.1.9            - Template engine
body-parser@1.20.2   - Request parsing
dotenv@16.3.1        - Environment variables
```

### Module Imports
```javascript
// TV Streaming App
const express = require('express');
const axios = require('axios');
const session = require('express-session');

// Identity Verification App
const express = require('express');
const axios = require('axios');
const session = require('express-session');
```

### Template Variables
```ejs
<!-- TV App (index.ejs) -->
<%= deviceCode %>
<%= userCode %>
<%= cibaTelephone %>

<!-- Identity App (dashboard.ejs) -->
<%= username %>
<%= deviceCodeCount %>
<%= cibaCount %>
<%= totalPending %>
```

---

## Configuration Files

### Environment Variables (.env)

**Required**:
```
PF_BASE_URL                # Ping Federate server URL
TV_CLIENT_ID              # OAuth client ID
TV_CLIENT_SECRET          # OAuth client secret
```

**Optional**:
```
TV_APP_PORT               # Default: 3000
IDENTITY_APP_PORT         # Default: 3001
TV_APP_URL                # For callbacks
IDENTITY_APP_URL          # For notifications
NODE_ENV                  # development/production
DEBUG                     # Debug logging
```

### package.json Scripts

```json
{
  "start:tv": "npm run start:tv",
  "start:identity": "npm run start:identity",
  "dev": "npm-run-all --parallel dev:tv dev:identity"
}
```

---

## Data Flow Summary

### Device Code Flow
```
TV App (request)
  → Ping Federate (authorize)
  → TV App (display code)
  → Other Device (verify)
  → Ping Federate (authenticate)
  → TV App (poll)
  → Ping Federate (return token)
  → TV App (authenticated)
```

### CIBA Flow
```
TV App (submit phone)
  → Ping Federate (create request)
  → Identity App (webhook)
  → Admin (dashboard)
  → Admin (approve)
  → Ping Federate (update)
  → TV App (poll)
  → Ping Federate (return token)
  → TV App (authenticated)
```

---

## Getting Started

### 1. Setup
```bash
# Clone/extract project
cd devicecode

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Configure Ping Federate URLs in .env
nano .env
```

### 2. Run
```bash
# Start both apps
npm run dev

# Or individually
npm run start:tv           # Terminal 1
npm run start:identity     # Terminal 2
```

### 3. Access
```
TV App:       http://localhost:3000
Identity App: http://localhost:3001/login
  Username:   admin
  Password:   admin123
```

### 4. Test
- Request device code on TV app
- Approve in Identity app
- Verify TV app receives token

---

## Customization Points

### Change Ports
Edit `.env`:
```
TV_APP_PORT=3002
IDENTITY_APP_PORT=3003
```

### Change Polling Interval
Edit `server.js`:
```javascript
// Default 5 seconds for device code
const pollInterval = session.pollInterval * 1000;

// Default 2 seconds for CIBA
const pollInterval = session.cibaPollInterval * 1000;
```

### Add Database
Replace Map storage with database queries:
```javascript
// FROM:
const deviceCodeRequests = new Map();

// TO:
async function getDeviceCodes() {
  return db.collection('device_codes').find().toArray();
}
```

### Style Customization
Edit `.ejs` files `<style>` sections for design changes.

### Add Features
- SMS notifications for CIBA
- Email notifications
- Request history/persistence
- Advanced analytics
- Multi-tenancy
- Rate limiting

---

## Debugging

### Enable Debug Logging
```bash
DEBUG=express:*,axios npm run dev
```

### Browser DevTools
- F12 → Console for JavaScript errors
- F12 → Network for API requests
- F12 → Application for cookies/session

### Log Important Events
Edit `server.js`:
```javascript
console.log('Device code:', deviceCode);
console.log('CIBA request:', authReqId);
console.log('Token received:', accessToken);
```

### Monitor Requests
Use curl to test endpoints directly:
```bash
curl http://localhost:3000/status
curl http://localhost:3001/api/device-codes/pending
curl -X POST http://localhost:3000/device-code/request
```

---

## Production Checklist

- [ ] Replace `.env.example` values with real credentials
- [ ] Enable HTTPS/TLS
- [ ] Replace in-memory storage with database
- [ ] Implement request signing/validation
- [ ] Add rate limiting
- [ ] Enable audit logging
- [ ] Setup monitoring/alerting
- [ ] Configure backups
- [ ] Security testing
- [ ] Load testing

---

## Support & Resources

- **README.md**: General documentation
- **API.md**: API reference
- **ARCHITECTURE.md**: System design
- **INTEGRATION_GUIDE.md**: Ping Federate setup
- **TROUBLESHOOTING.md**: Common issues

For Ping Federate docs: https://docs.pingidentity.com/
For OAuth specs: https://tools.ietf.org/html/rfc8628
