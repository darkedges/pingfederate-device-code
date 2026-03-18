# Error Handling System

This document explains how the TV Station App handles and displays errors to users.

## Overview

The TV Station App has three layers of error handling:

1. **Server-side (Node.js/Express)** - Detects errors when calling Ping Federate
2. **Network layer (Axios)** - Catches connection, timeout, and HTTP errors
3. **Client-side (Browser JavaScript)** - Displays errors to users with helpful hints

```
┌─────────────────────────────────────────────────────────────────┐
│ User Actions (Browser)                                          │
│ - Click login button                                            │
│ - Enter device code and click authorize                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ TV Station App Server (Node.js/Express)                         │
│ - Validate request parameters                                   │
│ - Call Ping Federate endpoints                                  │
│ - Catch errors from axios                                       │
│ - Generate error hints                                          │
│ - Return error response                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Client-side Error Handler (JavaScript)                          │
│ - Catch fetch errors                                            │
│ - Parse error response                                          │
│ - Display to user with server hints                             │
│ - Show troubleshooting guidance                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ User sees: Error message + Troubleshooting tip                  │
└─────────────────────────────────────────────────────────────────┘
```

## Server-Side Error Detection

### Location
`tv-station-app/server.js` - `/device/authorize` endpoint

### Error Types Detected

#### 1. Network Errors (Connection Issues)

```
Error Code: ECONNREFUSED
Meaning: Cannot connect to Ping Federate
Hint: "Cannot connect to Ping Federate. Verify PF_BASE_URL in your .env"
Response: { error: 'connection_refused', hint: '...' }
HTTP Status: 503 (Service Unavailable)
```

```
Error Code: ENOTFOUND
Meaning: Cannot resolve Ping Federate hostname (DNS issue)
Hint: "Cannot resolve Ping Federate hostname. Check your DNS settings."
Response: { error: 'dns_resolution_failed', hint: '...' }
HTTP Status: 503
```

```
Error Code: ETIMEDOUT
Meaning: Request took too long (default: 10 seconds)
Hint: "Ping Federate did not respond within 10 seconds. The server may be overloaded or slow."
Response: { error: 'timeout', hint: '...' }
HTTP Status: 504 (Gateway Timeout)
```

#### 2. OAuth/Protocol Errors

```
OAuth Error Code: invalid_code
Meaning: Device code is invalid or expired
Hint: "The user code appears to be invalid or has expired. Try requesting a new code."
Response: { error: 'invalid_code', hint: '...' }
HTTP Status: 400
```

```
OAuth Error Code: invalid_request
Meaning: Malformed request to Ping Federate
Hint: "Check the user code format. It should be in the format: XXXX-XXXX"
Response: { error: 'invalid_request', hint: '...' }
HTTP Status: 400
```

```
OAuth Error Code: invalid_client
Meaning: Client credentials (ID/Secret) are invalid
Hint: "Client authentication failed. Check STATION_CLIENT_ID and STATION_CLIENT_SECRET in your .env"
Response: { error: 'invalid_client', hint: '...' }
HTTP Status: 401
```

#### 3. HTTP Errors

```
HTTP Status: 500
Meaning: Ping Federate encountered an error
Hint: "Ping Federate returned an internal server error. Check the PF logs."
Response: { error: 'server_error', hint: '...', status: 500 }
HTTP Status: 500
```

### Error Response Format

All error responses from the server follow this format:

```json
{
  "error": "error_code",
  "description": "Human readable error description",
  "hint": "Specific troubleshooting tip for this error",
  "status": 400,
  "details": "Additional technical details if available"
}
```

### Code Example: Server-Side Error Handling

From `tv-station-app/server.js`:

```javascript
app.post('/device/authorize', requireAuthCodeFlow, async (req, res) => {
  try {
    const userCode = req.body.user_code?.toUpperCase();
    
    // Validate input
    if (!userCode || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(userCode)) {
      return res.status(400).json({
        error: 'invalid_format',
        description: 'User code must be in format: XXXX-XXXX',
        hint: 'Check the code displayed on the TV screen and re-enter it.'
      });
    }

    // Call Ping Federate with timeout
    const response = await axios.post(
      `${process.env.PF_BASE_URL}/as/user_authz.oauth2`,
      `user_code=${encodeURIComponent(userCode)}`,
      {
        auth: {
          username: process.env.STATION_CLIENT_ID,
          password: process.env.STATION_CLIENT_SECRET
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000  // 10 second timeout
      }
    );

    res.json({ success: true, message: 'Device authorized successfully' });
  } catch (error) {
    // Network errors (no response from server)
    if (!error.response) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'connection_refused',
          description: 'Cannot connect to Ping Federate',
          hint: 'Cannot connect to Ping Federate. Verify PF_BASE_URL in your .env'
        });
      }
      if (error.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'dns_error',
          description: 'Cannot resolve hostname',
          hint: 'Cannot resolve Ping Federate hostname. Check your DNS settings.'
        });
      }
      if (error.code === 'ETIMEDOUT') {
        return res.status(504).json({
          error: 'timeout',
          description: 'Request timeout',
          hint: 'Ping Federate did not respond within 10 seconds. The server may be overloaded.'
        });
      }
    }

    // Ping Federate returned an error response
    if (error.response?.data?.error) {
      const oauthError = error.response.data.error;
      const hint = getErrorHint(oauthError);
      
      return res.status(error.response.status || 400).json({
        error: oauthError,
        description: error.response.data.error_description || 'OAuth error occurred',
        hint: hint,
        status: error.response.status
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'server_error',
      description: error.message,
      hint: 'An unexpected error occurred. Check the server logs.'
    });
  }
});

// Helper function to provide context-specific hints
function getErrorHint(errorCode) {
  const hints = {
    'invalid_code': 'The user code appears to be invalid or has expired. Try requesting a new code.',
    'invalid_client': 'Client authentication failed. Check STATION_CLIENT_ID and STATION_CLIENT_SECRET in .env',
    'invalid_request': 'Check the user code format. Should be: XXXX-XXXX',
    'invalid_scope': 'Client scope is not configured correctly in Ping Federate.',
    'access_denied': 'User cancelled the authorization or device was denied.'
  };
  return hints[errorCode] || 'An error occurred. Check the error code for details.';
}
```

## Client-Side Error Handling

### Location
`tv-station-app/views/device.ejs` - JavaScript fetch handler

### Error Detection Flow

```javascript
// Step 1: Send request to server
fetch('/device/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_code: userCode })
})

// Step 2: Check HTTP response
.then(response => {
  // Step 3: Try to parse JSON response
  return response.json().then(data => ({
    ok: response.ok,
    status: response.status,
    data: data
  }));
})

// Step 4: Check if successful
.then(({ ok, status, data }) => {
  if (ok) {
    // Success - show green message
    showStatusMessage(data.message, 'success');
  } else {
    // Error - show red message with server hints
    displayError(data, status);
  }
})

// Step 5: Catch network errors
.catch(error => {
  // Network error - show detailed diagnostic
  showNetworkError(error);
});
```

### Network Error Detection

The client-side handler detects specific network error scenarios:

```javascript
// Network unreachable (gateway error)
if (error.message.includes('gateway') || error.message.includes('Failed to fetch')) {
  showError({
    error: 'network_error',
    description: 'Network error communicating with server',
    hint: 'Check your internet connection and try again.'
  });
}

// CORS error (cross-origin blocked)
if (error.message.includes('CORS') || error.message.includes('blocked')) {
  showError({
    error: 'cors_error',
    description: 'CORS error',
    hint: 'Contact your administrator about server configuration.'
  });
}

// Generic network error
showError({
  error: 'network_error',
  description: `Network error: ${error.message}`,
  hint: 'The server may be temporarily unavailable. Try again in a few moments.'
});
```

### Error Display Format

The client displays errors in a structured format:

```html
<div class="message error-details">
  <strong>Error: {error_code}</strong>
  <p>{description}</p>
  
  <div class="tip-box">
    <strong>💡 Troubleshooting Tip:</strong>
    <p>{hint_from_server}</p>
  </div>
  
  <small>Status: {http_status_code}</small>
</div>
```

### CSS Styling for Error Messages

```css
.message.error-details {
  background-color: #fee;  /* Light red */
  border-left: 4px solid #f44;
  padding: 12px;
  margin: 10px 0;
  border-radius: 4px;
  color: #333;
}

.tip-box {
  background-color: #ffd;  /* Light yellow */
  border: 1px solid #cc8;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  font-size: 0.9em;
}

.message.success {
  background-color: #efe;  /* Light green */
  border-left: 4px solid #4f4;
  color: #333;
}
```

## OAuth Callback Error Handling

### Location
`tv-station-app/views/error.ejs` - Error page for login flow failures

### Error Scenarios

1. **User denies permission**
   - Error Code: `access_denied`
   - Message: "You have denied the application access"
   - Help: "If you want to authorize the device, please login and grant permissions"

2. **Invalid scope**
   - Error Code: `invalid_scope`
   - Message: "The OAuth scope is not configured"
   - Help: "Contact your administrator to configure OAuth scopes"

3. **Client not configured**
   - Error Code: `invalid_client`
   - Message: "The OAuth client is not configured correctly"
   - Help: "Verify STATION_CLIENT_ID and credentials in .env"

### Error Page Display

```html
<div class="error-details">
  <h2>Authorization Error</h2>
  <p>Code: <code>{error_code}</code></p>
  <p>Description: {error_description}</p>
  
  <div class="help-box">
    <h3>What can you do?</h3>
    <ul>
      <li>{context_specific_help}</li>
      <li>Contact your administrator if the problem persists</li>
    </ul>
  </div>
  
  <p>
    <a href="/">← Return to Home</a> | 
    <a href="/auth/login">← Try Again</a>
  </p>
</div>
```

## Error Flow Summary

### Happy Path (Success)
```
User enters code → Server validates → Calls Ping FE → 
Success response → Client shows green box → Device authorized
```

### Error Path (Network Issue)
```
User enters code → Server tries to call Ping FE → 
ECONNREFUSED (can't connect) → Server returns 503 with hint → 
Client shows red box with hint "Check PF_BASE_URL" → User sees actionable message
```

### Error Path (Invalid Code)
```
User enters code → Server validates format OK → Calls Ping FE → 
Ping FE returns 400: invalid_code → Server returns hint → 
Client shows red box with hint "Code expired or invalid" → User requests new code
```

### Error Path (Browser Network Error)
```
User enters code → Client tries fetch → Network fails → 
Catch handler detects CORS or network error → 
Client shows red box with network error details → User checks internet/firewall
```

## Testing Error Scenarios

### Test Connection Refused
```bash
# Change PF_BASE_URL to invalid host
PF_BASE_URL=https://invalid-host.local npm run dev:station

# Expected: ECONNREFUSED error, server returns 503 with hint
```

### Test Timeout
```bash
# Use netcat to create fake server that never responds
nc -l 9999

# Change PF_BASE_URL to localhost:9999
PF_BASE_URL=http://localhost:9999 npm run dev:station

# Expected: ETIMEDOUT after 10 seconds, server returns 504 with hint
```

### Test Invalid Credentials
```bash
# Use wrong STATION_CLIENT_SECRET
STATION_CLIENT_SECRET=wrong-secret npm run dev:station

# Try to authorize device code
# Expected: HTTP 401 from Ping FE, server returns hint about credentials
```

### Test HTTP 404
```bash
# Use wrong endpoint URL
PF_BASE_URL=https://id.ping.darkedges.com/wrong-path npm run dev:station

# Try to authorize
# Expected: HTTP 404, server returns hint about endpoint configuration
```

## Best Practices for Error Handling

1. **Always provide a hint**: Include `hint` field with actionable advice
2. **Use HTTP status codes**: 4xx for client errors, 5xx for server errors
3. **Include error codes**: Use standard OAuth codes when applicable
4. **Show technical details**: Include status codes and error descriptions for debugging
5. **Style errors visually**: Red for errors, yellow for tips
6. **Make it recoverable**: Offer retry buttons and clear next steps
7. **Log server errors**: Keep detailed logs for debugging production issues

## Monitoring and Debugging

### Enable Debug Logging
```bash
DEBUG=express:* npm run dev:station
```

### Check Server Logs
```
Listen for POST /device/authorize requests
Check for error.code and error.message
```

### Inspect Browser Network
```
F12 > Network tab > Filter XHR
Click authorize button
Check POST /device/authorize response
Look at Response body for error details
```

### Check Browser Console
```
F12 > Console tab
Look for JavaScript errors
Check for network fetch errors
```
