# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### 1. npm install fails

**Error**: `npm ERR! code ERESOLVE`

**Solution**:
```bash
# Use npm legacy peer deps flag
npm install --legacy-peer-deps

# Or upgrade npm
npm install -g npm@latest
npm install
```

#### 2. Node version incompatibility

**Error**: `Node version 12 or required but found 10`

**Solution**:
```bash
# Check current Node version
node -v

# Update Node.js from https://nodejs.org/
# Or use Node Version Manager
nvm install 16
nvm use 16
```

---

### Port Issues

#### 1. Port 3000 already in use

**Error**: `listen EADDRINUSE: address already in use :::3000`

**Windows Solution**:
```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or use different port
set TV_APP_PORT=3002
npm run start:tv
```

**Mac/Linux Solution**:
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
TV_APP_PORT=3002 npm run start:tv
```

#### 2. Both ports in use

**Solution**: Use different ports
```bash
# Terminal 1
TV_APP_PORT=3002 npm run start:tv

# Terminal 2
IDENTITY_APP_PORT=3003 npm run start:identity

# Then access:
# http://localhost:3002 (TV App)
# http://localhost:3003/login (Identity App)
```

---

### Connection Issues

#### 1. Cannot connect to TV App

**Error**: `http://localhost:3000 refused connection`

**Checklist**:
- [ ] Is the TV app running? (Check terminal for "listening on port 3000")
- [ ] Is Node.js still running? (Not crashed)
- [ ] Is the port correct? (Should be 3000)
- [ ] Firewall blocking? (Check Windows Firewall/antivirus)

**Solution**:
```bash
# Restart the app
npm run start:tv

# Check if process is running
ps aux | grep node          # Mac/Linux
tasklist | findstr node     # Windows

# Check port is listening
netstat -an | grep 3000     # Mac/Linux
netstat -ano | findstr 3000 # Windows
```

#### 2. Cannot connect to Identity App

**Error**: `http://localhost:3001/login refused connection`

**Solution**:
```bash
# Start Identity app
npm run start:identity

# Verify both apps are running
npm run dev  # Starts both automatically
```

#### 3. Cannot connect to Ping Federate

**Error**: `Cannot connect to https://pingfederate.example.com`

**Checklist**:
- [ ] Is Ping Federate running?
- [ ] Is the URL correct in .env?
- [ ] Is there network connectivity?
- [ ] Is the certificate valid (for HTTPS)?
- [ ] Is Ping Federate on the same network?

**Solution**:
```bash
# Test Ping Federate connectivity
curl https://your-pf-server:9031/pf/

# Or disable SSL verification temporarily (development only!)
# Set environment variable:
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

### Authentication & Flow Issues

#### 1. Device code request fails

**Error**: `Error requesting device code: Cannot POST /as/device_authorization.oauth2`

**Causes**:
- Ping Federate not configured
- Wrong URL in .env
- Client credentials invalid

**Solution**:
```bash
# Verify Ping Federate is running
curl https://your-pf-server:9031/pf/admin/

# Check .env configuration
cat .env | grep PF_BASE_URL

# Verify client exists in Ping Federate
# Admin Console > OAuth 2.0 > Clients
# Should see: tv-app-client
```

#### 2. User code shows but doesn't authenticate

**Error**: Device code appears but polling doesn't receive token

**Causes**:
- User hasn't verified the code
- Verification endpoint not set up correctly
- Admin hasn't approved in Identity app

**Solution**:
```bash
# 1. Check if admin approved
curl http://localhost:3001/api/device-codes/pending

# 2. Manually test verification endpoint
curl https://your-pf-server:9031/pf/device-verification?user_code=AB12:CD34

# 3. Check polling is happening
# Look at browser Network tab (F12)
# Should see repeated POST to /status
```

#### 3. CIBA request not showing in dashboard

**Error**: Phone number accepted but request doesn't appear in Identity app

**Causes**:
- Webhook not configured
- Identity app not running
- CIBA not enabled in Ping Federate

**Solution**:
```bash
# 1. Verify Identity app is running
ps aux | grep "identity-verification" 
curl http://localhost:3001/dashboard

# 2. Check CIBA is enabled in Ping FE
# Admin Console > Server Configuration > CIBA
# Should be "Enabled"

# 3. Check request was created (API)
curl http://localhost:3001/api/ciba/pending

# 4. Test CIBA endpoint directly
curl -X POST https://your-pf-server:9031/as/ciba \
  -u tv-app-client:secret \
  -d "scope=openid&login_hint=%2B1-555-123-4567"
```

---

### Session & Token Issues

#### 1. Session lost after refresh

**Error**: Page refreshes and shows "Not authenticated"

**Causes**:
- Session expired (default 30 minutes)
- Cookies disabled
- Session lost on app restart

**Solution**:
```bash
# Clear browser cookies
# Chrome: DevTools > Application > Cookies > Delete all

# Check cookies are enabled
# Browser Settings > Privacy > Cookies

# Increase session timeout in source code
// tv-streaming-app/server.js
cookie: {
  maxAge: 86400000  // 24 hours instead of 30 min
}
```

#### 2. "Invalid token" error

**Error**: `Failed to fetch user information: 401 Unauthorized`

**Causes**:
- Token expired
- Token invalid format
- Ping Federate key mismatch

**Solution**:
```bash
# Logout and re-authenticate
curl -X POST http://localhost:3000/logout

# Check token format in browser DevTools
# Application > Cookies > look for session token

# Verify Ping FE signing key matches
# Admin Console > Server Configuration > Signing Certificates
```

#### 3. Polling stops after a few requests

**Error**: Device code flow starts but stops polling after 2-3 requests

**Causes**:
- Polling function crashed
- Browser error in console
- Timer cleared unexpectedly

**Solution**:
```bash
# Open browser DevTools (F12)
# Console tab - look for JavaScript errors
# Network tab - check polling requests

# Check server logs for errors
# Terminal running TV app - look for error messages

# Try manual polling test
curl http://localhost:3000/status
# Should show polling is active
```

---

### Admin Portal Issues

#### 1. Login fails

**Error**: `Invalid username or password`

**Checklist**:
- [ ] Username: `admin`
- [ ] Password: `admin123`
- [ ] No typos
- [ ] Caps lock off

**Solution**:
```bash
# Check hardcoded credentials in code
# identity-verification-app/server.js line 34:
// const users = new Map([
//   ['admin', 'admin123'],
//   ['user@example.com', 'password123']
// ]);

# Try alternate credential:
# Username: user@example.com
# Password: password123
```

#### 2. Dashboard shows no requests

**Error**: Pending requests list is empty

**Causes**:
- No device code/CIBA requests initiated
- Requests expired
- Webhook not working

**Solution**:
```bash
# 1. Create a new request first
# TV App > Click "Request Device Code"

# 2. Check API endpoint
curl http://localhost:3001/api/device-codes/pending
# Should return at least one request

# 3. Refresh dashboard
# F5 in browser or click "Refresh" button

# 4. Check request isn't expired
# Device codes expire after 1800 seconds
# CIBA requests expire after 600 seconds
```

#### 3. Approve button doesn't work

**Error**: Click approve, nothing happens

**Solution**:
```bash
# 1. Check browser error
F12 > Console tab - look for errors

# 2. Test API directly
curl -X POST http://localhost:3001/api/device-codes/dc_123/approve \
  -H "Content-Type: application/json"

# 3. Check request exists
curl http://localhost:3001/api/device-codes/pending

# 4. Restart Identity app
npm run start:identity
```

---

### Browser Issues

#### 1. Page shows white/blank

**Error**: Browser loads but page is empty

**Solution**:
```bash
# Check browser console for errors (F12)
# Common error: EJS template not found

# Restart app
npm run start:tv

# Clear browser cache (Ctrl+Shift+Del)

# Try different browser (Chrome, Firefox, Edge)
```

#### 2. Buttons don't work

**Error**: Click buttons but nothing happens

**Solution**:
```bash
# 1. Check for JavaScript errors
F12 > Console > Look for red X errors

# 2. Check Network tab
F12 > Network > Click button > See if requests fail

# 3. Verify API endpoints are accessible
# Try in console:
fetch('http://localhost:3000/status')
  .then(r => r.json())
  .then(console.log)

# 4. Check Content-Type headers
# Should be application/json
```

#### 3. Polling shows "No Progress"

**Error**: Status shows user code but never receives token

**Solution**:
```bash
# 1. Open browser DevTools (F12)
# Network tab > Filter XHR
# Click "Request Device Code"
# Should see repeated /status requests

# 2. If no requests, polling failed
# Check console for errors

# 3. Run server in debug mode
DEBUG=express:* npm run start:tv

# 4. Check polling interval
# Should be 2-5 seconds between requests
```

---

### Logging & Debugging

#### 1. Enable verbose logging

**For TV App**:
```bash
DEBUG=express:*,axios npm run start:tv
```

**For Identity App**:
```bash
DEBUG=express:* npm run start:identity
```

**For Node process**:
```bash
node --trace-warnings tv-streaming-app/server.js
```

#### 2. View detailed server output

```bash
# Capture all output to file
npm run start:tv > tv-app.log 2>&1

# View in real-time
npm run start:tv | tee tv-app.log
```

#### 3. Monitor network requests

**Browser DevTools**:
```
F12 > Network tab > Start recording
Click action to test
Look at requests/responses
```

**Command line**:
```bash
# Monitor HTTP traffic (Mac/Linux)
tcpdump -i lo -A 'tcp port 3000'

# Or use mitmproxy
mitmproxy -p 8080
# Configure browser proxy to localhost:8080
```

---

### Performance Issues

#### 1. Polling takes too long

**Error**: Device code takes 30+ seconds to authenticate

**Causes**:
- Polling interval too long (default 5 seconds)
- Verification endpoint slow
- Network latency

**Solution**:
```bash
# Check actual polling requests in Network tab
F12 > Network > Filter XHR
# Time between requests should be 2-5 seconds

# Reduce polling interval (Ping FE config)
# Server Configuration > Device Authorization Grant
# Poll Interval: 2 seconds (minimum)
```

#### 2. Dashboard slow with many requests

**Error**: Dashboard takes 10+ seconds to load

**Causes**:
- Too many pending requests (hundreds)
- In-memory Map not optimized
- Browser rendering slow

**Solution**:
```bash
# Limit pending requests showed
# Edit views/dashboard.ejs
// .slice(0, 20)  // Show only first 20

# Clear old requests
curl -X POST http://localhost:3001/api/cleanup

# Use database instead of Map
// For production: MongoDB, PostgreSQL
```

---

### Specific Error Messages

#### "ENOTFOUND pingfederate.example.com"

**Cause**: DNS resolution failed

```bash
# Check DNS
nslookup pingfederate.example.com
ping pingfederate.example.com

# Use IP address instead
# Or add to /etc/hosts (Mac/Linux)
# Or add to C:\Windows\System32\drivers\etc\hosts (Windows)
```

#### "ECONNREFUSED 127.0.0.1:3000"

**Cause**: Port 3000 not listening

```bash
# Ensure app is started
npm run start:tv

# Check if process crashed
ps aux | grep node

# Look at error message in terminal
```

#### "Certificate Error"

**Cause**: SSL/TLS certificate issue

```bash
# For development, disable cert verification
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run start:tv

# Or add to .env
export NODE_TLS_REJECT_UNAUTHORIZED=0

# For production: Use valid certificate
```

---

### Getting Help

If issues persist:

1. **Check logs**:
   - Browser console (F12)
   - Terminal output
   - .log files

2. **Print debugging info**:
   ```bash
   console.log('Debug:', deviceCode, status);
   ```

3. **Test API endpoints directly**:
   ```bash
   curl http://localhost:3000/status
   curl http://localhost:3001/api/device-codes/pending
   ```

4. **Check configuration**:
   ```bash
   cat .env
   # Verify all URLs and credentials
   ```

5. **Restart everything**:
   ```bash
   # Stop all Node processes
   pkill node      # Mac/Linux
   taskkill /IM node.exe /F  # Windows
   
   # Clear cache
   rm -rf node_modules/.cache
   
   # Reinstall and restart
   npm install
   npm run dev
   ```

---

## Quick Reference

### Start Commands

```bash
# Development (both apps)
npm run dev

# Production (both apps)
NODE_ENV=production npm run dev

# Individual apps
npm run start:tv
npm run start:identity

# With custom ports
TV_APP_PORT=3002 npm run start:tv
IDENTITY_APP_PORT=3003 npm run start:identity

# With debug logging
DEBUG=* npm run dev
```

### URLs

```
TV App:           http://localhost:3000
Identity App:     http://localhost:3001/login
Device Verify:    http://localhost:3001/verify-device-code?code=ABC:DEF
CIBA Verify:      http://localhost:3001/verify-ciba?id=req_id
API - Status:     http://localhost:3000/status
API - Device:     http://localhost:3001/api/device-codes/pending
API - CIBA:       http://localhost:3001/api/ciba/pending
```

### Default Credentials

```
Identity App:
  Username: admin
  Password: admin123

Alternative:
  Username: user@example.com
  Password: password123
```

### File Locations

```
Config:     .env, .env.example
TV App:     tv-streaming-app/server.js
Identity:   identity-verification-app/server.js
Templates:  */views/*.ejs
Logs:       Check terminal output
Docs:       docs/
```
