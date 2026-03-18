# Quick Help Guide

**Can't figure out where to look?** Use this quick decision tree to find the right documentation.

## 🤔 What's Your Issue?

### Network/Connection Problems

**Are you seeing "Network error: Failed to fetch"?**
- Yes → [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md)
- No, but connection is failing → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#connection-issues)

**Error messages include:**
- ECONNREFUSED → [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md#1-connection-refused---econnrefused)
- ENOTFOUND → [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md#2-host-not-found---enotfound)
- ETIMEDOUT → [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md#3-request-timeout---etimedout)
- HTTP 401 or 403 → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#401-unauthorized-on-login)
- HTTP 404 → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#404-on-device-authorization)

### Setup/Installation Problems

**Issue during npm install?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#installation-issues)

**Port already in use?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#port-issues)

**Need to set up Ping Federate integration?**
- First time → [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)
- Having issues → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#connection-issues-3-cannot-connect-to-ping-federate)

### Authentication/Login Problems

**Can't login to TV Station App?**
- Shows 401 error → [TV Station App README](tv-station-app/README.md#401-unauthorized-on-login)
- Shows 404 error → [TV Station App README](tv-station-app/README.md#404-on-device-authorization)
- Other error → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#authentication--flow-issues)

**OAuth callback shows error page?**
- Yes → [tv-station-app/README.md](tv-station-app/README.md#common-issues)
- Not sure what the error means → [ERROR_HANDLING.md](ERROR_HANDLING.md#oauth-callback-error-handling)

### Device Code / Authorization Problems

**Device code request fails?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#1-device-code-request-fails)

**Device code shows but never authenticates?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#2-user-code-shows-but-doesnt-authenticate)

**Can't authorize device code on TV Station App?**
- Shows error → [TV Station App README](tv-station-app/README.md#device-code-authorization-fails)
- Network error → [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md)

### CIBA (Phone Authentication) Problems

**CIBA request not showing on phone?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#3-ciba-request-not-showing-in-dashboard)

**Phone doesn't receive notification?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#ciba-request-not-approved)

### Session/Cookie Problems

**Session lost after refresh?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#1-session-lost-after-refresh)

**Getting "Invalid token" error?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#2-invalid-token-error)

**Polling stops working?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#3-polling-stops-after-a-few-requests)

### Admin Portal Problems

**Can't login to dashboard?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#1-login-fails)

**Dashboard shows no requests?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#2-dashboard-shows-no-requests)

**Approve button doesn't work?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#3-approve-button-doesnt-work)

### Browser/UI Problems

**Page shows white or blank?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#1-page-shows-whiteblank)

**Buttons don't work?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#2-buttons-dont-work)

**Status shows no progress?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#3-polling-shows-no-progress)

### Performance Problems

**Everything is slow?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#performance-issues)

**Polling takes 30+ seconds?**
- Yes → [TROUBLESHOOTING.md](TROUBLESHOOTING.md#1-polling-takes-too-long)

### I Want To Understand How Something Works

**How does error handling work?**
- → [ERROR_HANDLING.md](ERROR_HANDLING.md)

**What's the system architecture?**
- → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**What are all the API endpoints?**
- → [docs/API.md](docs/API.md)

**How do I set up Ping Federate?**
- → [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)

**What's in this project?**
- → [README.md](README.md)
- → [STRUCTURE.md](STRUCTURE.md)

**I'm new, where do I start?**
- → [README.md](README.md) first
- → [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) for setup
- → [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for everything else

## 🔧 Quick Diagnostic Commands

```bash
# Test Ping Federate connectivity
ping id.ping.darkedges.com
nslookup id.ping.darkedges.com

# Find what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Run with debug logging
DEBUG=express:* npm run dev

# Check if server is running
curl http://localhost:3000/
curl http://localhost:3001/
```

## 📺 Browser DevTools Checklist

When troubleshooting, always check:

1. **Console Tab (F12 > Console)**
   - Look for red error messages
   - Check for JavaScript errors
   - Look for network-related errors

2. **Network Tab (F12 > Network)**
   - Click action that's failing
   - Check if requests are sent
   - Look at response status (200, 401, 404, 500, etc.)
   - Check Response tab for error details

3. **Application Tab (F12 > Application)**
   - Check Cookies are present
   - Look for session cookies
   - Verify local storage if used

## 🆘 When None of This Helps

1. **Enable debug mode**: `DEBUG=express:* npm run dev`
2. **Check server output**: Look for error messages in terminal
3. **Read the error message carefully**: All our errors include hints
4. **Try the diagnostic commands above**: Isolate what's failing
5. **Check each component**:
   - Is Node.js running? `node -v`
   - Is npm installed? `npm -v`
   - Is Ping Federate reachable? `ping` or `curl`
   - Are environment variables set? `echo %PF_BASE_URL%`

## 📚 Document Map

| Need                     | Go To                                                    |
| ------------------------ | -------------------------------------------------------- |
| First time setup         | [README.md](README.md)                                   |
| Integration guide        | [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)   |
| Network errors           | [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) |
| General troubleshooting  | [TROUBLESHOOTING.md](TROUBLESHOOTING.md)                 |
| Error codes & handling   | [ERROR_HANDLING.md](ERROR_HANDLING.md)                   |
| API reference            | [docs/API.md](docs/API.md)                               |
| System design            | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)             |
| Project structure        | [STRUCTURE.md](STRUCTURE.md)                             |
| TV Station App docs      | [tv-station-app/README.md](tv-station-app/README.md)     |
| Full documentation index | [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)         |

---

**Tip**: Use Ctrl+F (Cmd+F on Mac) to search within each document!

**Can't find what you need?** Start here: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
