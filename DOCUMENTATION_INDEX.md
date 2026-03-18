# Documentation Index

Welcome to the Device Authorization Grant & CIBA Demo project! This guide will help you find the right documentation for your needs.

## 🚀 Quick Start

- **First time here?** Start with [README.md](README.md)
- **See the project structure?** Check [STRUCTURE.md](STRUCTURE.md)
- **Want to integrate with Ping Federate?** Read [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)

## 🔍 Find Your Issue

### I'm seeing "Network error: Failed to fetch" on TV Station App
→ **Read**: [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md)
- ECONNREFUSED - Cannot connect
- ENOTFOUND - DNS resolution failed
- ETIMEDOUT - Request timeout
- CORS errors
- Detailed troubleshooting steps

### I need to understand how errors work
→ **Read**: [ERROR_HANDLING.md](ERROR_HANDLING.md)
- How errors are detected on the server
- How errors are displayed in the browser
- Error response format
- Testing different error scenarios

### I'm having other issues (ports, authentication, etc)
→ **Read**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Port conflicts (EADDRINUSE)
- Device code polling not working
- Session and token issues
- Admin portal login problems

### I want to know the API endpoints
→ **Read**: [docs/API.md](docs/API.md)
- TV Streaming App endpoints
- TV Station App endpoints
- Request/response formats
- Error responses

### I want to understand the system design
→ **Read**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- System architecture diagrams
- Flow diagrams (Device Code, CIBA)
- Component interactions
- Data flow

### I want to integrate this with Ping Federate
→ **Read**: [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)
- Step-by-step setup instructions
- Ping Federate configuration
- Client credential setup
- Environment variables

## 📋 Documentation Files Overview

### Root Level Documents

| File                                                     | Purpose                        | When to Read                     |
| -------------------------------------------------------- | ------------------------------ | -------------------------------- |
| [README.md](README.md)                                   | Project overview & quick start | First time here                  |
| [STRUCTURE.md](STRUCTURE.md)                             | Detailed project structure     | Understanding the codebase       |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md)                 | General troubleshooting guide  | Having issues with the app       |
| [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) | Network error diagnostics      | "Network error: Failed to fetch" |
| [ERROR_HANDLING.md](ERROR_HANDLING.md)                   | Error handling architecture    | Understanding how errors work    |

### In `docs/` Folder

| File                                              | Purpose                             |
| ------------------------------------------------- | ----------------------------------- |
| [API.md](docs/API.md)                             | Complete API reference              |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)           | System design & diagrams            |
| [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) | How to integrate with Ping Federate |

### In `tv-station-app/` Folder

| File                                                 | Purpose                               |
| ---------------------------------------------------- | ------------------------------------- |
| [tv-station-app/README.md](tv-station-app/README.md) | TV Station App specific documentation |

### In `tv-streaming-app/` Folder

| File                                                     | Purpose                           |
| -------------------------------------------------------- | --------------------------------- |
| [tv-streaming-app/server.js](tv-streaming-app/server.js) | Device Code & CIBA implementation |

## 🎯 Common Scenarios

### Scenario 1: "I can't connect to Ping Federate"
1. Check [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) - "Connection Refused" section
2. Run network diagnostics: `ping id.ping.darkedges.com`
3. Verify `PF_BASE_URL` in `.env`
4. Check your firewall/VPN

### Scenario 2: "Devices can't authorize with their codes"
1. Check [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) - "Device Code Authorization Fails"
2. Verify device code hasn't expired (1800 seconds)
3. Check user code format: `XXXX-XXXX`
4. See [ERROR_HANDLING.md](ERROR_HANDLING.md) - "OAuth/Protocol Errors"

### Scenario 3: "Login keeps failing"
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - "Authentication & Flow Issues"
2. Verify `STATION_CLIENT_ID` and `STATION_CLIENT_SECRET` are correct
3. Check [tv-station-app/README.md](tv-station-app/README.md) - "401 Unauthorized" section

### Scenario 4: "I see a network error but don't know what it means"
1. Read [ERROR_HANDLING.md](ERROR_HANDLING.md) - "Error Detection Flow"
2. Check browser console (F12) for details
3. Look up the error code in [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md)

### Scenario 5: "I want to set this up from scratch"
1. Read [README.md](README.md) - Installation section
2. Follow [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)
3. Configure your Ping Federate server
4. Set environment variables in `.env`
5. Run `npm run dev` to start both apps

### Scenario 6: "Poll interval is too slow"
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - "Performance Issues"
2. Polling intervals (default): Device Code: 5 seconds, CIBA: 2 seconds
3. Can be adjusted in Ping Federate configuration

## 🔧 Environment Variables Quick Reference

```env
# Ping Federate Configuration
PF_BASE_URL=https://id.ping.darkedges.com

# TV Streaming App (Device Client)
TV_CLIENT_ID=tv-app-client
TV_CLIENT_SECRET=client-secret-here
TV_APP_PORT=3000
TV_SESSION_SECRET=tv-session-secret

# TV Station App (Authorization Server)
STATION_CLIENT_ID=tv-station-client
STATION_CLIENT_SECRET=station-secret-here
STATION_APP_BASE_URL=http://localhost:3001
TV_STATION_APP_PORT=3001
STATION_SESSION_SECRET=station-session-secret
```

See [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) for complete setup.

## 🛠️ Diagnostic Tools

### Check if Ping Federate is running
```bash
curl -k https://id.ping.darkedges.com/
```

### Test DNS resolution
```bash
nslookup id.ping.darkedges.com
```

### Test the device authorization endpoint
```bash
curl -X POST https://id.ping.darkedges.com/as/user_authz.oauth2 \
  -u tv-station-client:client-secret \
  -d "user_code=TEST1234"
```

### Check which process is using a port
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### Enable debug logging
```bash
DEBUG=express:* npm run dev
```

### View detailed error information
1. Open browser DevTools: F12
2. Go to Network tab
3. Make the request that's failing
4. Click on the request and see the Response tab

## 📞 When You Need Help

### I've read the docs but still stuck
1. **Check the error code** - All possible errors are documented in [ERROR_HANDLING.md](ERROR_HANDLING.md)
2. **Follow diagnostic steps** - Each issue in [TROUBLESHOOTING.md](TROUBLESHOOTING.md) and [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) has step-by-step debugging
3. **Enable debug logging** - Use `DEBUG=express:* npm run dev` to see detailed server logs
4. **Check browser console** - F12 > Console tab for JavaScript errors
5. **Inspect network requests** - F12 > Network tab to see what requests are failing

### Common Debug Commands

```bash
# Run with detailed logging
DEBUG=express:* npm run dev

# Run specific app with logging
DEBUG=express:* npm run dev:station

# Check server output in a file
npm run dev:station > app.log 2>&1

# Watch the log in real-time
tail -f app.log  # Mac/Linux
Get-Content app.log -Tail 20 -Wait  # Windows PowerShell
```

## 🎓 Learning Path

### For Beginners
1. Start with [README.md](README.md)
2. Understand the flow in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. See what endpoints are available in [docs/API.md](docs/API.md)
4. Follow [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) to set it up

### For Developers
1. Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design
2. Study [ERROR_HANDLING.md](ERROR_HANDLING.md) for error handling patterns
3. Check [docs/API.md](docs/API.md) for endpoint details
4. Review the source code in `tv-streaming-app/server.js` and `tv-station-app/server.js`

### For Network/SysAdmins
1. Read [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) for networking issues
2. Check [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) for Ping Federate setup
3. Use diagnostic tools section above to test connectivity

## 📄 Quick Reference Cards

### Error Codes

See [ERROR_HANDLING.md](ERROR_HANDLING.md) for complete error definitions.

**Network Errors:**
- ECONNREFUSED → Cannot connect to Ping Federate
- ENOTFOUND → DNS resolution failed
- ETIMEDOUT → Request took too long
- CORS → Cross-origin request blocked

**OAuth Errors:**
- invalid_code → User code is invalid or expired
- invalid_client → Client credentials are wrong
- invalid_request → Request format is incorrect
- access_denied → User denied the request

### Key Endpoints

**Device Code Flow:**
- `POST /device-code/request` → Create new device code
- `GET /status` → Check authorization status
- `POST /as/user_authz.oauth2` → Authorize device code

**CIBA Flow:**
- `POST /ciba/request` → Send authentication to phone
- `GET /status` → Check approval status
- Response contains access token

See [docs/API.md](docs/API.md) for complete endpoint documentation.

## 🔄 Version History

- **Current** - TV Station App with Authorization Code Grant, enhanced error handling, network diagnostics
- **Previous** - Device Code Grant and CIBA flows only (TV Streaming App)

## 📞 Support Resources

- Ping Federate Admin Console: Check for error logs under `/pf/log/`
- Browser DevTools: F12 for JavaScript errors, Network tab for requests
- Server Logs: Check terminal output when running `npm run dev`
- This documentation: All common issues are documented here

---

**Last Updated**: December 2024
**Questions?** Check the appropriate guide above or enable debug logging for more details.
