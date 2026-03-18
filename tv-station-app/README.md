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

**CSRF State Error**
- Session was cleared or tab was closed
- Browser cookies might be disabled
- Clear cookies and try again

**401 Unauthorized on Login**
- Check `STATION_CLIENT_ID` and `STATION_CLIENT_SECRET` in .env
- Verify Ping Federate client is configured correctly
- Ensure redirect URI matches: `STATION_APP_BASE_URL/auth/callback`

**404 on Device Authorization**
- Verify endpoint is: `/as/user_authz.oauth2`
- Check Ping Federate configuration for Device Code Grant support
- Verify client credentials have correct grants configured

**Device Code Authorization Fails**
- Ensure user code format is correct (e.g., `QQWP-TJ6B`)
- Verify device code hasn't expired
- Check that device hasn't already been authorized
