## TV Station App

The TV Station App is a separate web application that handles device code authorization using OAuth 2.0 Authorization Code Grant flow.

### Purpose

While the TV Streaming App runs on devices requesting authentication via Device Code Grant or CIBA flows, the TV Station App provides a protected endpoint where authorized users can approve those device code requests.

### Key Features

- **Authorization Code Grant Authentication**: Users must login with their Ping Federate credentials
- **Protected `/device` Endpoint**: Only authenticated users can access device code authorization
- **Device Code Authorization**: Submit device codes to `/as/user_authz.oauth2` endpoint
- **Session Management**: Secure session handling with CSRF protection

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ TV Streaming App (Port 3000)                            │
│ - Initiates Device Code requests                        │
│ - Initiates CIBA flows                                  │
│ - Shows user: "Go to TV Station App to authorize"       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ TV Station App (Port 3001)                              │
│ - Login via Authorization Code Grant                    │
│ - Protected `/device` endpoint                          │
│ - Users enter device code and submit to Ping Federate   │
│ - Posts to: POST /as/user_authz.oauth2                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Ping Federate                                           │
│ - Processes Authorization Code Grant for login          │
│ - Processes device code authorization requests          │
└─────────────────────────────────────────────────────────┘
```

### Endpoints

#### Authentication
- `GET /auth/login` - Initiates Authorization Code Grant login flow
- `GET /auth/callback` - Receives authorization code from Ping Federate
- `POST /auth/logout` - Logs out user and clears session

#### Device Code Authorization (Protected)
- `GET /device` - Protected endpoint for device code authorization form
- `POST /device/authorize` - Submits device code to Ping Federate `/as/user_authz.oauth2`

#### User API
- `GET /api/user` - Get current authenticated user info

### Usage Flow

1. User visits TV Station App home page (`http://localhost:3001`)
2. Clicks "Login with Ping Federate"
3. Redirected to Ping Federate authorization endpoint
4. User enters credentials and grants access
5. Redirected back to `/auth/callback` with authorization code
6. App exchanges code for access token
7. App fetches user info from userinfo endpoint
8. User redirected to `/device` endpoint
9. User enters device code from TV and clicks "Authorize Device"
10. App submits to Ping Federate: `POST /as/user_authz.oauth2` with user_code parameter
11. If successful, message confirms device was authorized
12. Device polls and receives notification that it has been authorized

### Environment Variables

```
# Ping Federate  
PF_BASE_URL=https://pingfederate.example.com

# TV Station App OAuth Client
STATION_CLIENT_ID=tv-station-client
STATION_CLIENT_SECRET=your-station-client-secret-here

# Application URLs
STATION_APP_BASE_URL=http://localhost:3001
TV_STREAMING_APP_URL=http://localhost:3000

# Ports
TV_STATION_APP_PORT=3001

# Session
STATION_SESSION_SECRET=station-session-secret-change-me-in-production
```

### Security Features

- **CSRF Protection**: State parameter validation on OAuth callback
- **Secure Session**: HTTP-Only session cookies (HTTPS in production)
- **Access Control**: Middleware checks authentication before allowing /device endpoint access
- **Token Validation**: Access tokens verified with Ping Federate userinfo endpoint

### Running the App

Standalone:
```bash
node tv-station-app/server.js
```

With TV Streaming App:
```bash
npm run dev  # Runs both apps in parallel
```

Individual:
```bash
npm run dev:station  # TV Station App only (with auto-reload)
npm run start:station  # TV Station App only (no auto-reload)
```

### Dependencies

- express - Web framework
- express-session - Session management
- axios - HTTP client
- dotenv - Environment configuration
- ejs - Template engine

### Troubleshooting

#### Quick Links
- **[Network Error Troubleshooting](../TROUBLESHOOTING_NETWORK.md)** - Detailed guide for "Network error: Failed to fetch", connection failures, timeouts
- **[Main Troubleshooting Guide](../TROUBLESHOOTING.md)** - Port issues, authentication errors, session problems
- **[API Documentation](../docs/API.md)** - Complete API reference
- **[Architecture Documentation](../docs/ARCHITECTURE.md)** - System design and flow diagrams

#### Common Issues

**CSRF State Error**
- Session was cleared or tab was closed
- Browser cookies might be disabled
- Solution: Clear cookies and try again

**Network Error: Failed to Fetch**
- Cannot connect to Ping Federate
- See [Network Error Troubleshooting](../TROUBLESHOOTING_NETWORK.md) for detailed diagnostics
- Quick checks:
  1. Is Ping Federate running? Try `ping id.ping.darkedges.com`
  2. Check `PF_BASE_URL` in `.env`
  3. Verify firewall allows HTTPS to Ping Federate

**401 Unauthorized on Login**
- Check: Is `STATION_CLIENT_ID` correct in `.env`?
- Check: Is `STATION_CLIENT_SECRET` correct in `.env`?
- Check: Does Ping Federate client match the credentials in `.env`?
- Solution: Verify credentials in Ping Federate Admin Console > OAuth 2.0 > Clients

**404 on Device Authorization**
- Error message: "POST /as/user_authz.oauth2 returned 404"
- Check: Is Device Code Grant enabled in Ping Federate?
- Check: Is endpoint `/as/user_authz.oauth2` correct for your PF version?
- Solution: Admin Console > Server Configuration > Device Authorization Grant

**Device Code Authorization Fails**
- Problem: User code accepted but device doesn't receive authorization
- Check: Is user code format correct? (e.g., `QQWP-TJ6B`)
- Check: Has device code already expired? (Default: 1800 seconds)
- Check: Has device already been authorized once?
- Solution: Request a new device code from TV Streaming App

**Generic Network Errors**
- Problem: "Network error" with unclear message
- Debug steps:
  1. Open browser DevTools (F12)
  2. Console tab - look for detailed error messages
  3. Network tab - check the failed POST request
  4. See response body for specific error details
- Most common: ECONNREFUSED (can't reach Ping Federate), ETIMEDOUT (request too slow)

#### Enable Detailed Logging

**For TV Station App errors**:
```bash
DEBUG=express:* npm run dev:station
```

**To capture all output**:
```bash
npm run dev:station 2>&1 | tee app.log
```

**For network request inspection**:
1. Open browser DevTools: F12
2. Go to Network tab
3. Click "Authorize Device" button
4. Look at the POST request (should show details)
5. Check Response tab for error details from server

#### Testing Connectivity

**Test if Ping Federate is reachable**:
```powershell
# Windows
ping id.ping.darkedges.com
nslookup id.ping.darkedges.com

# Test HTTPS access
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
Invoke-WebRequest -Uri "https://id.ping.darkedges.com/" -SkipCertificateCheck
```

**Test device authorization endpoint directly**:
```bash
curl -X POST "https://id.ping.darkedges.com/as/user_authz.oauth2" \
  -u "tv-station-client:client-secret" \
  -d "user_code=TEST1234" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

#### Configuration Verification Checklist

- [ ] `PF_BASE_URL` is set and correct (should be: https://id.ping.darkedges.com)
- [ ] `STATION_CLIENT_ID` matches client name in Ping Federate
- [ ] `STATION_CLIENT_SECRET` matches client secret in Ping Federate
- [ ] `STATION_APP_BASE_URL` is http://localhost:3001
- [ ] `TV_STATION_APP_PORT` is 3001 (or different if port conflict)
- [ ] `.env` file exists and has all required variables
- [ ] TV Station App is running: `npm run dev:station`
- [ ] Port 3001 is not blocked by firewall
- [ ] Can ping/resolve Ping Federate hostname
- [ ] Device Code Grant is enabled in Ping Federate

#### If You're Still Stuck

1. Check [Network Error Troubleshooting](../TROUBLESHOOTING_NETWORK.md) for network diagnostics
2. Check [Main Troubleshooting Guide](../TROUBLESHOOTING.md) for general issues
3. Review browser console (F12) for JavaScript errors
4. Review server logs in terminal for Node/Express errors
5. Try restarting the app: `npm run dev:station`
6. Clear browser cookies and try again
7. Test with curl to eliminate browser variables

For detailed debugging of the "Network error: Failed to fetch" scenario, see [TROUBLESHOOTING_NETWORK.md](../TROUBLESHOOTING_NETWORK.md) which includes:
- Specific error code detection (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, CORS)
- How to interpret server error hints
- Step-by-step connectivity testing
- Configuration validation checklist
