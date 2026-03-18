# Architecture Documentation

## System Overview

This document describes the architecture of the Device Authorization Grant & CIBA Demo project.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Devices                            │
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────────┐  │
│  │   TV/Device         │        │  Phone/Computer         │  │
│  │   (Port 3000)       │        │  (Browser)              │  │
│  │                     │        │                        │  │
│  │ - Requests code    │        │ - Views requests       │  │
│  │ - Polls for auth   │        │ - Authenticates        │  │
│  │ - Uses CIBA flow   │        │ - Approves requests    │  │
│  └──────────┬──────────┘        └──────────┬─────────────┘  │
│             │                              │                 │
└─────────────┼──────────────────────────────┼─────────────────┘
              │                              │
              │ HTTP/REST                    │
              │                              │
┌─────────────▼──────────────────────────────▼─────────────────┐
│                    Authorization Server                       │
│                                                              │
│              Ping Federate (or Mock)                         │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │  Device Code         │  │  CIBA                    │    │
│  │  Endpoint            │  │  Endpoint                │    │
│  │                      │  │                          │    │
│  │ - Generates codes   │  │ - Creates auth requests  │    │
│  │ - Manages tokens    │  │ - Initiates notifications│    │
│  │ - Validates polling │  │ - Polls for approval    │    │
│  └──────────┬───────────┘  └──────────┬───────────────┘    │
│             │                         │                    │
└─────────────┼─────────────────────────┼────────────────────┘
              │                         │
              │ OAuth 2.0               │ OAuth 2.0
              │ Callbacks               │ Callbacks
              │                         │
┌─────────────▼─────────────────────────▼────────────────────┐
│              Identity Verification                          │
│              Application (Port 3001)                        │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Admin Portal                                      │   │
│  │                                                    │   │
│  │  - Login/Authentication                           │   │
│  │  - Dashboard with pending requests               │   │
│  │  - Device code verification                      │   │
│  │  - CIBA request approval                         │   │
│  │  - Request history & audit logs                  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. TV Streaming App (Client)

**Purpose**: Simulates a device that needs authentication

**Key Features**:
- Requests device codes from authorization server
- Displays user codes to guide other users
- Initiates CIBA flows with phone numbers
- Polls continuously for token completion
- Manages session and access tokens

**Technologies**:
- Express.js (Web server)
- EJS (Template engine)
- Axios (HTTP client)
- Express Session (Session management)

**Key Endpoints**:
```
GET  /                      - Home page with UI
POST /device-code/request   - Request device code
POST /ciba/request          - Initiate CIBA with phone
GET  /status                - Check auth status
GET  /userinfo              - Get authenticated user
POST /logout                - End session
```

**Data Flow - Device Code**:
```
1. User → TV App: Click "Request Device Code"
2. TV App → Ping FE: POST /as/device_authorization.oauth2
3. Ping FE → TV App: Returns device_code, user_code, verification_uri
4. TV App: Displays user_code on screen
5. TV App (background): Starts polling thread
6. TV App → Ping FE: Polls /as/token.oauth2 every 5 seconds
7. Other User → Ping FE: Visits verification_uri, enters user_code
8. Other User: Authenticates with credentials
9. Ping FE: Marks device_code as approved
10. TV App (polling): Receives access_token
11. TV App: Session authenticated, streams content
```

**Data Flow - CIBA**:
```
1. User → TV App: Enter phone number
2. TV App → Ping FE: POST /as/ciba (login_hint: phone)
3. Ping FE → TV App: Returns auth_req_id
4. Ping FE → Phone: Sends push notification
5. TV App (background): Starts polling thread
6. TV App → Ping FE: Polls /as/token.oauth2 every 2 seconds
7. User on Phone: Approves authentication request
8. Ping FE: Marks auth_req_id as approved
9. TV App (polling): Receives access_token
10. TV App: Session authenticated
```

### 2. Identity Verification App (Server)

**Purpose**: Admin portal for approving/denying authentication requests

**Key Features**:
- User authentication/login
- Dashboard showing pending requests
- Device code verification interface
- CIBA request approval interface
- Webhook handlers for new requests
- In-memory request storage

**Technologies**:
- Express.js (Web server)
- EJS (Template engine)
- Express Session (Session management)

**Key Endpoints**:
```
GET  /login                           - Login form
POST /login                           - Authenticate admin
GET  /dashboard                       - Admin dashboard
GET  /api/device-codes/pending        - Get pending device codes
GET  /api/ciba/pending                - Get pending CIBA requests
POST /api/device-codes/:id/approve    - Approve device code
POST /api/device-codes/:id/deny       - Deny device code
POST /api/ciba/:id/approve            - Approve CIBA request
POST /api/ciba/:id/deny               - Deny CIBA request
POST /webhooks/device-code            - Webhook from Ping FE
POST /webhooks/ciba                   - Webhook from Ping FE
```

**Admin Workflow**:
```
1. Admin → App: Visit http://localhost:3001/login
2. Admin: Enter credentials (admin/admin123)
3. App: Redirects to dashboard
4. Dashboard: Shows pending device codes and CIBA requests
5. Admin: Clicks on a request to review details
6. Verification Page: Shows request details (client, scope, time)
7. Admin: Clicks "Approve" or "Deny"
8. App: Updates request status to approved/denied
9. App (if webhook configured): Notifies Ping Federate
10. TV App (polling): Receives approval response
11. TV App: Completes authentication
```

### 3. Ping Federate (Authorization Server)

**Purpose**: OAuth 2.0 authorization server with Device Code & CIBA support

**Key Components**:
- Device Authorization Grant endpoint
- CIBA (Backchannel) endpoint
- Token endpoint
- User verification endpoint
- Webhook/notification system

**Endpoints Used**:
```
POST /as/device_authorization.oauth2  - Request device code
POST /as/ciba                         - Initiate CIBA
POST /as/token.oauth2                 - Poll for token
GET  /as/userinfo.oauth2              - Get user info (with token)
```

## Request/Response Sequences

### Device Code Flow Sequence

```
┌─────┐                    ┌──────┐                     ┌──────────┐
│ TV  │                    │ Ping │                     │ Identity │
│App  │                    │ FE   │                     │ App      │
└─┬───┘                    └──┬───┘                     └─────┬────┘
  │                           │                              │
  │ 1. POST device_auth       │                              │
  │ (client_id, scope)       │                              │
  ├──────────────────────────>│                              │
  │                           │ 2. Generate codes            │
  │                           │ (device_code,               │
  │                           │  user_code)                 │
  │<──────────────────────────┤                              │
  │ 3. Display user_code      │                              │
  │ on screen                 │                              │
  │                           │                              │
  │ ┌─────────────────────────┴─────────────────────────┐   │
  │ │ Start polling (every 5 seconds)                  │   │
  │ └─────────────────────────┬─────────────────────────┘   │
  │                           │                          │   │
  │                           │                          │   │
  │                           │      4. User visits       │   │
  │                           │      verification_uri     │   │
  │                           │      in browser on        │   │
  │                           │      other device         │   │
  │                           │<─────────────────────────┤
  │                           │                          │
  │                           │ 5. User authenticates     │
  │                           │ (username, password)     │
  │                           │                          │
  │                           │ 6. PF marks device_code   │
  │                           │ as approved              │
  │                           │                          │
  │ 7. Poll /token            │                              │
  │ (grant_type: device_code) │                              │
  ├──────────────────────────>│                              │
  │                           │ 8. Return access_token      │
  │<──────────────────────────┤                              │
  │ 9. Session authenticated  │                              │
```

### CIBA Flow Sequence

```
┌─────┐              ┌──────┐              ┌──────────┐           ┌──────┐
│ TV  │              │ Ping │              │ Identity │           │Phone │
│App  │              │ FE   │              │ App      │           │      │
└─┬───┘              └──┬───┘              └────┬─────┘           └──┬───┘
  │                     │                       │                  │
  │ 1. POST /as/ciba    │                       │                  │
  │ (phone_number)     │                       │                  │
  ├────────────────────>│                       │                  │
  │                     │ 2. Create auth_req_id │                  │
  │                     │ Send webhook (opt)   │                  │
  │<──────────────────  ├──────────────────────>│                  │
  │ (auth_req_id)       │                       │ 3. Webhook       │
  │                     │                       │ callback         │
  │                     │                       │                  │
  │ 4. Start polling    │                       │ 4. Send push     │
  │ (every 2 secs)      │                       │ notification     │
  │                     │                       ├─────────────────>│
  │                     │                       │                  │
  │                     │                       │ 5. User sees     │
  │                     │                       │ approval request │
  │                     │                       │                  │
  │ Poll /token         │                       │ 6. User clicks   │
  │ (auth_req_id)       │                       │ "Approve"        │
  ├────────────────────>│                       │                  │
  │                     │ -authorization_pending│ 7. Admin approves│
  │<────────────────────┤<──────────────────────┤  (in dashboard)  │
  │                     │                       │                  │
  │ Poll /token again   │                       │                  │
  ├────────────────────>│                       │                  │
  │                     │ 8. Return access_token│                  │
  │<────────────────────┤                       │                  │
  │ 9. Authenticated    │                       │                  │
```

## Data Storage

### In-Memory Storage (Development)

```javascript
// Device Code Requests
const deviceCodeRequests = new Map([
  {
    id: 'dc_1234567890',
    deviceCode: 'device_code_abc123',
    userCode: 'AB12:CD34',
    status: 'pending|approved|denied',
    createdAt: '2024-03-18T10:30:00Z',
    expiresAt: 1710753000000,
    approvedBy: 'admin',
    ...
  }
])

// CIBA Requests
const cibaRequests = new Map([
  {
    id: 'ciba_1234567890',
    authReqId: 'auth_req_abc123',
    phoneNumber: '+1-555-123-4567',
    status: 'pending|approved|denied',
    createdAt: '2024-03-18T10:30:00Z',
    expiresAt: 1710752400000,
    approvedBy: 'admin',
    ...
  }
])
```

### Session Storage

```javascript
req.session = {
  // Authentication state
  authenticated: true,
  username: 'admin',
  
  // Device Code flow
  deviceCode: 'device_code_abc123',
  userCode: 'AB12:CD34',
  verificationUri: 'https://pf.example.com/device',
  deviceFlowStartTime: 1710752400000,
  
  // CIBA flow
  cibaBankId: 'auth_req_abc123',
  cibaTelephone: '+1-555-123-4567',
  cibaStartTime: 1710752400000,
  
  // Tokens
  accessToken: 'eyJhbGc...',
  idToken: 'eyJhbGc...',
  refreshToken: 'refresh_token_abc123',
  tokenExpiresIn: 3600,
  tokenReceivedTime: 1710752400000
}
```

## Polling Mechanism

### Device Code Polling

```javascript
// Client-side (TV App)
function startDeviceCodePolling(deviceCode, session) {
  const pollInterval = session.pollInterval * 1000; // 5000ms
  
  const pollTimer = setInterval(async () => {
    // Call token endpoint
    const response = await axios.post(
      '/as/token.oauth2',
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode
      }
    );
    
    // Handle responses:
    // - authorization_pending: Not approved yet, continue polling
    // - access_token: Authorization complete, stop polling
    // - expired_token: Code expired, stop polling
  }, pollInterval);
}
```

**Key Characteristics**:
- Interval: 5 seconds (configurable in Ping FE)
- Max duration: 1800 seconds (30 minutes)
- Server may respond with `slow_down` to increase interval
- No limit on number of requests

### CIBA Polling

```javascript
// Client-side (TV App)
function startCIBAPolling(authReqId, session) {
  const pollInterval = session.cibaPollInterval * 1000; // 2000ms
  
  const pollTimer = setInterval(async () => {
    const response = await axios.post(
      '/as/token.oauth2',
      {
        grant_type: 'urn:openid:params:grant-type:ciba',
        auth_req_id: authReqId
      }
    );
    
    // Handle responses:
    // - authorization_pending: Waiting for user approval
    // - access_token: Approved, token issued
    // - expired_token: Request expired
  }, pollInterval);
}
```

**Key Characteristics**:
- Interval: 2 seconds (configurable)
- Max duration: 600 seconds (10 minutes)
- Faster polling than device code flow
- Server may send `slow_down` response

## Security Considerations

### Current Implementation (Development)
- ✓ HTTP for local testing
- ✓ Basic client authentication (client_id:client_secret)
- ✓ Session-based user tracking
- ✓ Stateless token verification

### Production Implementation Needed
- [ ] HTTPS/TLS encryption
- [ ] PKCE (Proof Key for Code Exchange)
- [ ] Request signing and validation
- [ ] Rate limiting on polling
- [ ] Webhook signature validation
- [ ] Encrypted storage of sensitive data
- [ ] Multi-factor authentication for admin
- [ ] Audit logging for all approvals/denials
- [ ] IP whitelisting for admin access

## Error Handling

### Common Error Responses

**Device Code**:
```json
{
  "error": "authorization_pending",
  "description": "User hasn't approved yet"
}
```

```json
{
  "error": "slow_down",
  "description": "Polling too frequently"
}
```

```json
{
  "error": "expired_token",
  "description": "Device code has expired"
}
```

**CIBA**:
```json
{
  "error": "authorization_pending",
  "description": "Waiting for user action"
}
```

```json
{
  "error": "auth_req_id_not_found",
  "description": "Request ID invalid or expired"
}
```

## Scalability Considerations

### Current Limitations
- In-memory storage (limited to available RAM)
- Single-threaded polling
- No load balancing
- No distributed sessions

### Future Improvements
- Replace Map with Redis for distributed caching
- Implement database persistence
- Add request queueing system
- Horizontal scaling with load balancer
- Message queue for notifications (RabbitMQ, Kafka)
- Microservice architecture

## Testing

### Unit Testing
- Device code request validation
- Token parsing and validation
- Request approval/denial logic

### Integration Testing
- Full device code flow
- Full CIBA flow
- Admin approval workflow
- Session management

### Load Testing
- Multiple concurrent polling requests
- Dashboard with large request lists
- Webhook delivery under load

## Deployment Scenarios

### Development
```
npm run dev
- Both apps run on localhost
- In-memory storage
- HTTP only
```

### Staging
```
- Deploy to cloud (Docker containers)
- Use test Ping FE instance
- Redis for session storage
- HTTPS enabled
```

### Production
```
- Kubernetes or similar orchestration
- PostgreSQL/MongoDB for persistence
- Redis cluster for sessions
- Load balancer with SSL/TLS
- Ping FE enterprise setup
- Monitoring and alerting
```

## References

- RFC 8628: Device Authorization Grant
- OpenID Connect CIBA v1.0
- OAuth 2.0 Security Best Practices
- Ping Federate Documentation
