# API Documentation

## TV Streaming App API

### Base URL
```
http://localhost:3000
```

---

## Authentication Endpoints

### 1. Request Device Code
**Initiates Device Authorization Grant flow**

```http
POST /device-code/request
Content-Type: application/json
```

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "userCode": "AB12:CD34",
  "verificationUri": "https://pf.example.com/device",
  "expiresIn": 1800,
  "message": "Show the user code \"AB12:CD34\" on screen..."
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error requesting device code: ..."
}
```

**Notes:**
- After successful request, polling starts automatically
- User code should be displayed on the device
- Verification URI is where the user authenticates on another device
- Expires in 1800 seconds (30 minutes) by default

---

### 2. Request CIBA (Backchannel Authentication)
**Initiates CIBA flow with phone number**

```http
POST /ciba/request
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+1-555-123-4567"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "authReqId": "auth_req_abc123",
  "expiresIn": 600,
  "interval": 2,
  "message": "Authentication request sent to phone number: +1-555-123-4567..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error initiating CIBA flow: ..."
}
```

**Notes:**
- Phone number is required
- User receives push notification on their mobile device
- Auto-polling starts for authentication completion
- Request expires in 600 seconds (10 minutes)

---

## Status & Session Endpoints

### 3. Get Current Status
**Returns authentication and flow status**

```http
GET /status
```

**Response (200 OK):**
```json
{
  "authenticated": true,
  "deviceCode": {
    "active": false,
    "userCode": null,
    "elapsedSeconds": 45,
    "expiresIn": 1800
  },
  "ciba": {
    "active": false,
    "phoneNumber": null,
    "requestId": null,
    "elapsedSeconds": null,
    "expiresIn": null
  },
  "token": {
    "hasAccessToken": true,
    "hasIdToken": true,
    "expiresIn": 3600
  }
}
```

**Response when not authenticated:**
```json
{
  "authenticated": false,
  "deviceCode": {
    "active": true,
    "userCode": "AB12:CD34",
    "elapsedSeconds": 10,
    "expiresIn": 1800
  },
  "ciba": {
    "active": false,
    "phoneNumber": null,
    "requestId": null,
    "elapsedSeconds": null,
    "expiresIn": null
  },
  "token": null
}
```

**Notes:**
- Elapsed seconds shows how long the current flow has been running
- Token will only be present if authenticated
- Multiple flows cannot be active simultaneously

---

### 4. Get User Info
**Retrieves authenticated user information (requires valid token)**

```http
GET /userinfo
```

**Response (200 OK):**
```json
{
  "success": true,
  "userInfo": {
    "sub": "user-123",
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "phone_number": "+1-555-123-4567"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Not authenticated",
  "message": "Please complete device code or CIBA flow first"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Failed to fetch user information"
}
```

**Notes:**
- Requires successful authentication first
- Returns claims from the ID token
- User is already authenticated from the flow

---

### 5. Logout
**Clears session and logs out user**

```http
POST /logout
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Home Page

### 6. Get Home Page
**Serves the main UI**

```http
GET /
```

**Response:** HTML page with Device Code and CIBA forms

---

---

## Identity Verification App API

### Base URL
```
http://localhost:3001
```

---

## Authentication Endpoints

### 1. Login Page
**Serves the login form**

```http
GET /login
```

**Response:** HTML login form

---

### 2. Login Handler
**Authenticates admin user**

```http
POST /login
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```
username=admin&password=admin123
```

**Response (302 Redirect):**
- Success: Redirects to `/dashboard`
- Failure: Redirects to `/login?message=Invalid+credentials`

---

### 3. Logout
**Logs out authenticated user**

```http
POST /logout
```

**Response (302 Redirect):** Redirects to `/login`

---

## Admin Dashboard

### 4. Get Dashboard
**Main admin dashboard (requires authentication)**

```http
GET /dashboard
```

**Response:** HTML dashboard with statistics and request lists

**Notes:**
- Requires active session
- Shows counts and lists of pending requests
- Auto-refreshes every 5 seconds

---

## Device Code Endpoints

### 5. Get Pending Device Codes
**Retrieves list of pending device code requests**

```http
GET /api/device-codes/pending
```

**Response (200 OK):**
```json
{
  "count": 2,
  "requests": [
    {
      "id": "dc_1234567890",
      "userCode": "AB12:CD34",
      "deviceCode": "device_code_abc123",
      "createdAt": "2024-03-18T10:30:00.000Z",
      "expiresAt": 1710753000000,
      "clientInfo": {
        "clientId": "tv-app-client",
        "scope": "openid profile email",
        "requestedAt": "2024-03-18T10:30:00.000Z"
      }
    }
  ]
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized"
}
```

**Notes:**
- Only includes requests with status "pending"
- Returns empty array if no pending requests
- Requires authentication

---

### 6. Verify Device Code Page
**Shows device code details for approval**

```http
GET /verify-device-code?code=USERCODE
```

**Parameters:**
- `code`: User code or device code

**Response (200 OK):** HTML verification page with approve/deny buttons

**Response (404):**
```json
{
  "error": "Device code not found"
}
```

**Response (410):**
```json
{
  "error": "Device code has expired"
}
```

---

### 7. Approve Device Code
**Approves a device code request**

```http
POST /api/device-codes/{id}/approve
Content-Type: application/json
```

**Path Parameters:**
- `id`: Device code request ID

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device code approved",
  "request": {
    "id": "dc_1234567890",
    "status": "approved",
    "approvedAt": "2024-03-18T10:31:00.000Z",
    "approvedBy": "admin",
    "...": ""
  }
}
```

**Error Response (404):**
```json
{
  "error": "Request not found"
}
```

**Error Response (400):**
```json
{
  "error": "Request is not pending"
}
```

---

### 8. Deny Device Code
**Denies a device code request**

```http
POST /api/device-codes/{id}/deny
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "User denied on device"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device code denied",
  "request": {
    "id": "dc_1234567890",
    "status": "denied",
    "deniedAt": "2024-03-18T10:31:00.000Z",
    "deniedBy": "admin",
    "denialReason": "User denied on device",
    "...": ""
  }
}
```

---

## CIBA Endpoints

### 9. Get Pending CIBA Requests
**Retrieves list of pending CIBA requests**

```http
GET /api/ciba/pending
```

**Response (200 OK):**
```json
{
  "count": 1,
  "requests": [
    {
      "id": "ciba_1234567890",
      "authReqId": "auth_req_abc123",
      "phoneNumber": "+1-555-123-4567",
      "createdAt": "2024-03-18T10:30:00.000Z",
      "expiresAt": 1710752400000,
      "clientInfo": {
        "clientId": "tv-app-client",
        "scope": "openid profile email",
        "requestedAt": "2024-03-18T10:30:00.000Z"
      }
    }
  ]
}
```

**Notes:**
- Only includes requests with status "pending"
- Requires authentication

---

### 10. Verify CIBA Request Page
**Shows CIBA request details for approval**

```http
GET /verify-ciba?id=REQUEST_ID
```

**Parameters:**
- `id`: CIBA request ID

**Response (200 OK):** HTML verification page

**Response (404):**
```json
{
  "error": "CIBA request not found"
}
```

---

### 11. Approve CIBA Request
**Approves a CIBA request**

```http
POST /api/ciba/{id}/approve
Content-Type: application/json
```

**Path Parameters:**
- `id`: CIBA request ID

**Request Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "CIBA request approved",
  "request": {
    "id": "ciba_1234567890",
    "status": "approved",
    "approvedAt": "2024-03-18T10:31:00.000Z",
    "approvedBy": "admin",
    "...": ""
  }
}
```

---

### 12. Deny CIBA Request
**Denies a CIBA request**

```http
POST /api/ciba/{id}/deny
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "User denied on mobile device"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "CIBA request denied",
  "request": {
    "id": "ciba_1234567890",
    "status": "denied",
    "deniedAt": "2024-03-18T10:31:00.000Z",
    "deniedBy": "admin",
    "denialReason": "User denied on mobile device",
    "...": ""
  }
}
```

---

## Webhook Endpoints

### 13. Device Code Webhook
**Notification from Ping Federate when device code is requested**

```http
POST /webhooks/device-code
Content-Type: application/json
```

**Request Body:**
```json
{
  "device_code": "device_code_abc123",
  "user_code": "AB12:CD34",
  "client_id": "tv-app-client",
  "scope": "openid profile email",
  "issued_at": "2024-03-18T10:30:00.000Z",
  "expires_in": 1800
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device code request received",
  "requestId": "dc_1234567890"
}
```

**Notes:**
- Called by Ping Federate server
- Stores request in pending queue
- Admin dashboard auto-refreshes to show it

---

### 14. CIBA Webhook
**Notification from Ping Federate when CIBA request is initiated**

```http
POST /webhooks/ciba
Content-Type: application/json
```

**Request Body:**
```json
{
  "auth_req_id": "auth_req_abc123",
  "login_hint": "+1-555-123-4567",
  "client_id": "tv-app-client",
  "scope": "openid profile email",
  "issued_at": "2024-03-18T10:30:00.000Z",
  "expires_in": 600
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "CIBA request received",
  "requestId": "ciba_1234567890"
}
```

---

## Error Responses

### Common HTTP Status Codes

| Status | Meaning      | Notes                              |
| ------ | ------------ | ---------------------------------- |
| 200    | OK           | Request successful                 |
| 302    | Found        | Redirect (login/logout)            |
| 400    | Bad Request  | Missing/invalid parameters         |
| 401    | Unauthorized | Not authenticated or invalid token |
| 404    | Not Found    | Request/ID not found               |
| 410    | Gone         | Request expired                    |
| 500    | Server Error | Internal error                     |

### Common Error Messages

```json
{
  "error": "Not authenticated",
  "message": "Please complete device code or CIBA flow first"
}
```

```json
{
  "error": "Phone number is required"
}
```

```json
{
  "error": "Request not found"
}
```

```json
{
  "error": "Request is not pending"
}
```

---

## Example Workflows

### Device Code Flow Example

```bash
# 1. Request device code
curl -X POST http://localhost:3000/device-code/request

# Response:
# {
#   "success": true,
#   "userCode": "AB12:CD34",
#   "verificationUri": "...",
#   "expiresIn": 1800
# }

# 2. Check status
curl http://localhost:3000/status

# 3. Open Identity App and approve
# curl -X POST http://localhost:3001/api/device-codes/dc_xxx/approve

# 4. Check status again - should show authenticated
curl http://localhost:3000/status

# 5. Get user info
curl http://localhost:3000/userinfo
```

### CIBA Flow Example

```bash
# 1. Request CIBA
curl -X POST http://localhost:3000/ciba/request \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1-555-123-4567"}'

# 2. Check status
curl http://localhost:3000/status

# 3. Approve in Identity App
# curl -X POST http://localhost:3001/api/ciba/ciba_xxx/approve

# 4. Authenticated
curl http://localhost:3000/userinfo
```

---

## Rate Limiting Notes

Device Code and CIBA polling intervals:
- Device Code: 5 seconds between polls (minimum)
- CIBA: 2 seconds between polls (minimum)
- Responding with `slow_down` increases the interval

## Timeout Handling

- Device Code expires after 1800 seconds (30 minutes)
- CIBA requests expire after 600 seconds (10 minutes)
- Sessions expire after 1 hour by default
