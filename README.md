# Device Authorization Grant & CIBA Demo with Ping Federate

A sample project demonstrating OAuth 2.0 Device Authorization Grant (RFC 8628) and CIBA (Customer-Initiated Backchannel Authentication) flows with Ping Federate.

## 📖 Documentation Quick Links

- **[Quick Help Guide](QUICK_HELP.md)** — Use this to find what you need
- **[Network Error Troubleshooting](TROUBLESHOOTING_NETWORK.md)** — "Failed to fetch" and connection errors
- **[Full Documentation Index](DOCUMENTATION_INDEX.md)** — All documentation files
- **[API Reference](docs/API.md)** — All endpoints
- **[Architecture Guide](docs/ARCHITECTURE.md)** — System design

## Project Overview

### TV Streaming App (Port 3000)
A device client that simulates a TV streaming application needing authentication. Supports:
- **Device Code Grant Flow**: Request device code for authentication on another device
- **CIBA Flow**: Send authentication requests to user's phone number
- Real-time status updates with auto-refresh dashboard
- User information retrieval after successful authentication

## Architecture

```
┌──────────────────────────┐
│   TV Streaming App       │
│   (Device Client)        │
│   Port: 3000             │
│                          │
│ - Device Code Flow       │
│ - CIBA with Phone        │
└──────────┬───────────────┘
           │
           │ OAuth2/CIBA Requests
           │
┌──────────▼───────────────┐
│  Ping Federate 12.3.3.1  │
│  (Authorization Server)  │
│                          │
│ Device Auth Endpoint:    │
│  /as/device_authz.oauth2 │
│                          │
│ CIBA Endpoint:           │
│  /as/bc-auth.ciba        │
│                          │
│ Token Endpoint:          │
│  /as/token.oauth2        │
│                          │
│ Userinfo Endpoint:       │
│  /idp/userinfo.openid    │
└──────────────────────────┘
```

## Prerequisites

- Node.js 14+ and npm
- Ping Federate 12.3.3.1 (or compatible version)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

### 1. Install Dependencies

```bash
cd devicecode
npm install
```

### 2. Configure Environment Variables

Create `.env` file at the root of the project:

```
# ============================================
# Ping Federate Configuration
# ============================================
PF_BASE_URL=https://your-pingfederate.example.com
TV_CLIENT_ID=tv-app-client
TV_CLIENT_SECRET=your-client-secret

# ============================================
# Application Configuration
# ============================================
TV_APP_PORT=3000

# ============================================
# Session Configuration
# ============================================
TV_SESSION_SECRET=tv-session-secret-change-me-in-production

# ============================================
# Environment
# ============================================
NODE_ENV=development
```

Replace `your-pingfederate.example.com`, `tv-app-client`, and `your-client-secret` with your actual Ping Federate server URL and OAuth client credentials.

## Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

This will start the TV Streaming App on `http://localhost:3000`

### Production Mode

```bash
npm start
```

## Usage

### Device Code Flow

1. **Open TV App**: `http://localhost:3000`
2. **Click "Request Device Code"** button
3. **Device code is generated** (e.g., `AB12:CD34`)
4. **Share the User Code** with another user
5. **On another device or browser:**
   - Visit the verification URL shown
   - Login with your Ping Federate credentials
   - Authorize the device code request
6. **TV app polls Ping Federate** for authorization status
7. **Once authorized**, TV app **receives access token**
8. **User information is displayed** on the TV app

### CIBA (Customer-Initiated Backchannel Authentication)

1. **On TV App**: Click "Send CIBA Request"
2. **Enter phone number** (e.g., +1-555-123-4567)
3. **CIBA request sent** to Ping Federate
4. **On authenticated device:**
   - Receive push notification or check authentication app
   - Approve the request from the authenticator app
5. **TV app polls for approval** status (every 2 seconds)
6. **Once approved**, TV app receives access token
7. **User info is displayed** on the TV app

## API Endpoints

### TV Streaming App (`http://localhost:3000`)

#### Device Code Flow
- **POST** `/device-code/request` - Request device code
- **GET** `/status` - Get current auth status
- **GET** `/userinfo` - Get authenticated user info

#### CIBA Flow
- **POST** `/ciba/request` - Initiate CIBA with phone number
  - Body: `{ "phoneNumber": "+1-555-123-4567" }`

#### Session Management
- **POST** `/logout` - Logout and clear session
- **GET** `/` - Home page

## OAuth 2.0 Device Authorization Grant Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Device Client requests device code                  │
│    POST /as/device_authorization.oauth2               │
│    - client_id, scope                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─────► Returns:
                   │       - device_code
                   │       - user_code (e.g., AB12:CD34)
                   │       - verification_uri
                   │       - expires_in, interval
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 2. Device displays user_code on screen                 │
│    User visits verification_uri on another device      │
└───────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 3. Device polls for token (every 'interval' seconds)   │
│    POST /as/token.oauth2                               │
│    - grant_type: device_code                           │
│    - device_code                                       │
│    - client_id, client_secret                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Responses:
                   ├─────► authorization_pending (no token yet)
                   ├─────► slow_down (polling too fast)
                   └─────► access_token, id_token (success!)
```

## CIBA (Backchannel Authentication) Flow

```
┌────────────────────────────────────────────────────────┐
│ 1. Client initiates CIBA request with phone number    │
│    POST /as/ciba                                      │
│    - client_id, scope                                │
│    - login_hint (phone number)                       │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ├─────► Returns:
                   │       - auth_req_id
                   │       - expires_in
                   │       - interval
                   │
┌──────────────────▼─────────────────────────────────────┐
│ 2. Server sends push notification to user's phone     │
│    User sees approval request on mobile device        │
└────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 3. Client polls for authentication completion          │
│    POST /as/token.oauth2                               │
│    - grant_type: ciba                                  │
│    - auth_req_id                                       │
│    - client_id, client_secret                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Responses:
                   ├─────► authorization_pending (waiting)
                   ├─────► expired_token (took too long)
                   └─────► access_token, id_token (approved!)
```

## Configuration with Real Ping Federate

### 1. Create OAuth 2.0 Client

In Ping Federate Admin Console:

1. Go to **OAuth 2.0** > **Clients**
2. Create new client with:
   - **Client ID**: `tv-app-client`
   - **Grant Types**: 
     - Device Authorization Grant (RFC 8628)
     - CIBA
   - **Redirect URI**: `http://localhost:3000/callback`
   - **Scopes**: `openid`, `profile`, `email`

### 2. Configure Device Authorization Grant

1. Go to **Server Configuration** > **Device Authorization Grant**
2. Set:
   - **Token Endpoint Authentication Method**: Client Secret Basic
   - **User Verification Required**: True
   - **Expires In**: 1800 (30 minutes)
   - **Poll Interval**: 5 seconds

### 3. Configure CIBA

1. Go to **Server Configuration** > **CIBA**
2. Set:
   - **Authentication Request Expiration**: 600 (10 minutes)
   - **Authentication Request Polling Interval**: 2 seconds
   - **Channel Binding Messages**: Enable for security

### 4. Update Environment Variables

Update `.env` files with your Ping Federate URL and credentials:

```
PF_BASE_URL=https://your-pf-server.example.com:9031
PF_ADMIN_API_KEY=<your-admin-api-key>
```

## Security Considerations

### Development
- ✓ Uses HTTP (for local testing only)
- ✓ Stores sessions in memory (proof of concept)
- ✓ Uses basic authentication credentials in env vars

### Production Considerations
- [ ] **Use HTTPS** for all endpoints
- [ ] **Use secure session store** (Redis, MongoDB)
- [ ] **Implement PKCE** for added security
- [ ] **Use environment secrets management** (HashiCorp Vault, AWS Secrets Manager)
- [ ] **Implement rate limiting** on polling endpoints
- [ ] **Add CORS protection** for webhook endpoints
- [ ] **Validate webhook signatures** from Ping Federate
- [ ] **Use strong client secrets**
- [ ] **Implement audit logging** for approval/denial
- [ ] **Add multi-factor authentication** for admin portal

## Testing

### Manual Testing Scenario

**Device Code Flow Test:**
1. Start the TV app: `npm run dev`
2. Open TV app: `http://localhost:3000`
3. Click "Request Device Code" button
4. Note the generated user code (e.g., `AB12:CD34`)
5. Copy the verification URL and open it in another browser/device
6. Login with your Ping Federate credentials
7. Authorize the device code request
8. Back in TV app, observe status changing to "Authenticated"
9. User information will be displayed in the dashboard

**CIBA Flow Test:**
1. On TV app, click "Send CIBA Request"
2. Enter phone number: `+1-555-123-4567`
3. Submit the CIBA request
4. On your authenticated device (mobile), approve the request from your authenticator app
5. TV app polls Ping Federate and receives approval
6. Access token is obtained and user info is displayed

## Troubleshooting

### Quick Links to Detailed Guides

- **[Network Error Troubleshooting](TROUBLESHOOTING_NETWORK.md)** — "Network error: Failed to fetch", connection issues, timeouts, DNS errors
- **[Error Handling Reference](ERROR_HANDLING.md)** — Detailed explanation of error handling system, error codes, and diagnostics
- **[Main Troubleshooting Guide](TROUBLESHOOTING.md)** — Port issues, authentication errors, session problems, performance tuning

### Common Quick Fixes

#### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
TV_APP_PORT=3002 npm run dev
```

#### Polling Not Working
- Check browser console for errors (F12)
- Verify the TV app is running
- Check network tab in browser dev tools
- Ensure polling intervals are correct (Device Code: 5 seconds, CIBA: 2 seconds)
- Verify Ping Federate is accessible and responding

#### Session Lost
- Clear browser cookies for localhost
- Session timeout is set to 30 minutes by default
- Check if browser has cookies enabled

#### CIBA Request Not Approved
- Verify phone number is correct and registered in Ping Federate
- Check that CIBA is enabled in Ping Federate configuration
- Ensure authenticator app is installed and configured on the device
- Check Ping Federate logs for approval details

### For "Network error: Failed to fetch"

If you see a "Network error: Failed to fetch" message on the TV Station App, please see [TROUBLESHOOTING_NETWORK.md](TROUBLESHOOTING_NETWORK.md) for:
- Specific error detection (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, CORS)
- Step-by-step connectivity testing
- Ping Federate configuration verification
- Detailed error message interpretation

## Project Structure

```
devicecode/
├── package.json            # Project dependencies
├── pnpm-lock.yaml         # Dependency lock file
├── README.md              # This file
├── .env                   # Configuration (create this from .env.example)
├── .env.example           # Example environment variables
├── tv-streaming-app/
│   ├── server.js          # Express server with Device Code & CIBA endpoints
│   ├── public/            # Public assets (CSS, Scripts)
│   └── views/
│       └── index.ejs      # UI for device code & CIBA flows
├── docs/
│   ├── API.md             # API endpoint documentation
│   ├── ARCHITECTURE.md    # System architecture guide
│   ├── INTEGRATION_GUIDE.md # Integration instructions
│   └── TROUBLESHOOTING.md
├── quick-start.sh         # Quick start script (Linux/Mac)
├── quick-start.bat        # Quick start script (Windows)
└── STRUCTURE.md           # Detailed project structure
│   └── views/
│       ├── login.ejs       # Login page
│       ├── dashboard.ejs   # Admin dashboard
│       ├── device-verify.ejs
│       └── ciba-verify.ejs
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    └── INTEGRATION_GUIDE.md
```

## References and Documentation

### Project Documentation
- [Network Error Troubleshooting](TROUBLESHOOTING_NETWORK.md) — Common network errors and solutions
- [Error Handling Guide](ERROR_HANDLING.md) — Error handling architecture and debugging
- [Troubleshooting Guide](TROUBLESHOOTING.md) — General troubleshooting for all issues
- [API Reference](docs/API.md) — Complete API endpoint documentation
- [Architecture Guide](docs/ARCHITECTURE.md) — System design and flow diagrams
- [Integration Guide](docs/INTEGRATION_GUIDE.md) — Integration with Ping Federate

### External References
- RFC 8628: OAuth 2.0 Device Authorization Grant
- OpenID Connect CIBA (Core 1.0)
- Ping Federate OAuth 2.0 Documentation
- https://datatracker.ietf.org/doc/html/rfc8628
- https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Ping Federate logs
3. Enable debug logging in Node.js: `DEBUG=* npm run dev`
4. Check browser console and network tabs for errors

## Next Steps

1. **Integration**: Update with real Ping Federate instance
2. **Database**: Replace in-memory storage with persistent database
3. **Push Notifications**: Implement actual SMS/push for CIBA
4. **Admin Features**: Add request history, analytics, audit logs
5. **Security**: Implement PKCE, webhook signature validation, rate limiting
6. **UI/UX**: Enhance admin dashboard and user flows
