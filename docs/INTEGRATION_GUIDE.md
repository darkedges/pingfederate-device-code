# Ping Federate Integration Guide

This guide explains how to integrate this demo with a real Ping Federate instance.

## Prerequisites

- Ping Federate 11.0 or higher
- Administrative access to Ping Federate
- Network connectivity between TV App and Ping Federate
- Network connectivity between Identity Verification App and Ping Federate

## Step 1: Configure OAuth 2.0

### 1.1 Enable OAuth 2.0 Server

In Ping Federate Admin Console:

1. Navigate to **Server Configuration** > **Server Settings**
2. Verify **OAuth 2.0** is **Enabled**
3. Check the **Authorization Server** URL (default: `https://localhost:9031/as`)

### 1.2 Create OAuth 2.0 Client

1. Go to **OAuth 2.0** > **Clients**
2. Click **Create Client**
3. Fill in the following:

**Basic Information**
- **Client ID**: `tv-app-client`
- **Client Secret**: (Generate and save securely)
- **Client Type**: Confidential (Native/Desktop for device flow)
- **Name**: TV Streaming App Client
- **Description**: Client for device code and CIBA flows

**URLs & Paths**
- **Client URLs**: Add these redirect URIs:
  - `http://localhost:3000/callback`
  - `https://your-domain.com/callback` (for production)

**Grant Types**
Check the following grant types:
- ✓ Device Authorization Grant (RFC 8628)
- ✓ CIBA (Backchannel Authentication)
- (Optional) Authorization Code (for standard OAuth)
- (Optional) Refresh Token Grant

**Response Types**
- ✓ code
- ✓ token
- ✓ id_token
- ✓ token id_token

**Token & Session Configuration**
- **Access Token Type**: Bearer
- **Access Token Expiration**: 3600 (1 hour)
- **Refresh Token Expiration**: 86400 (24 hours)
- **Refresh Token Rolling**: Enabled

**PKCE Configuration** (Recommended for production)
- **PKCE Requirement**: Required
- **PKCE Method**: S256

**Client Authentication**
- **Token Endpoint Authentication Method**: Client Secret Basic
- **Subject Type**: Public

4. Click **Save**

5. Save the following credentials (you'll need them for `.env`):
   - Client ID: `tv-app-client`
   - Client Secret: (your generated secret)

---

## Step 2: Configure Device Authorization Grant

Device Code flow allows devices to request authentication.

### 2.1 Enable Device Authorization Grant

1. Go to **Server Configuration** > **Device Authorization Grant**
2. Enable by checking **Enabled**

### 2.2 Configure Device Flow Settings

Set the following parameters:

**Token Endpoint**
- **Token Endpoint Authentication Method**: Client Secret Basic
- **Create Refresh Token**: Yes

**User Verification**
- **User Verification Required**: Yes (recommended)
- **User Verification Method**: Login/Authenticate

**Device Code Settings**
- **Device Code Length**: 40 characters (default)
- **User Code Length**: 8 characters
- **User Code Format**: BASE20 (generates codes like AB12:CD34)

**Polling & Timeouts**
- **Expires In** (seconds): 1800 (30 minutes)
- **Poll Interval** (seconds): 5
- **Minimum Poll Interval**: 1 (minimum gap between requests)
- **Maximum Poll Interval**: 10 (maximum interval when slowing down)

**Verification Endpoint**
- **Verification Endpoint URL**: Configure where users go to verify
  - Should be a user-facing login page
  - Include device code verification
  - Redirect to device after completion

3. Click **Save**

### 2.3 Create Device Code Verification Page

Create a page or use Ping Federate's built-in device verification endpoint:

**Option A: Use built-in endpoint** (Recommended)
- URL: `https://your-pf-server/pf/device-verification`
- Automatically handles user code verification

**Option B: Custom verification page**
You can create a custom page that:
1. Accepts the user code
2. Verifies it against Ping Federate
3. Displays the device information
4. Prompts for authentication
5. Confirms to the device

---

## Step 3: Configure CIBA (Backchannel Authentication)

CIBA allows authentication via a user's phone or secondary device.

### 3.1 Enable CIBA

1. Go to **Server Configuration** > **CIBA**
2. Check **Enabled**

### 3.2 Configure CIBA Settings

**Authentication Request Endpoint**
- **Active**: Yes
- **Binding Message Support**: Enabled
- **Target Endpoint**: `/as/ciba`

**Polling Configuration**
- **Authentication Request Expiration** (seconds): 600 (10 minutes)
- **Authentication Request Polling Interval** (seconds): 2
- **Polling Response List**: Configure response messages

**Backchannel Token Delivery Mode**
- **Mode**: Poll (for this demo)
- (Alternative: Push - requires notification service)

**Backchannel Authentication Binding Message**
- **Enabled**: Yes
- Message displayed to user on approval

**Backchannel User Code**
- **Enabled**: No (for this demo)

3. Click **Save**

### 3.3 Configure User Lookup

CIBA needs to identify users by login hint (phone number):

1. Go to **User Management** > **Authentication Policies**
2. Create a policy that supports phone-based authentication
3. Configure attribute mapping:
   - Phone field from user directory
   - Support SMS-based OTP
   - Send notification to phone

### 3.4 Setup Push Notifications (Optional)

For push-based CIBA (instead of polling):

1. Go to **Extensions** or **Ping Notify** configuration
2. Configure SMS provider:
   - **Provider**: Twilio / AWS SNS / Custom
   - **API Key**: Your SMS provider credentials
   - **Template**: Define SMS message format

3. Configure mobile app integration:
   - Push certificate/key
   - FCM/APNs configuration
   - App registration

---

## Step 4: Configure Scopes

Device and CIBA flows need OAuth scopes defined.

### 4.1 Create/Verify Scopes

1. Go to **OAuth 2.0** > **Scopes**
2. Verify these scopes exist:

- **openid** (OpenID Connect)
  - Description: OpenID Connect scope
  - Include in Access Token: No

- **profile** (OpenID Connect)
  - Description: Profile information (name, etc.)
  - Include in Access Token: No

- **email**
  - Description: Email address
  - Include in Access Token: No

- **phone**
  - Description: Phone number
  - Include in Access Token: No

If not present, create them with appropriate claim mappings.

### 4.2 Configure Scope Mappings

1. Go to **OAuth 2.0** > **Scope Mapping**
2. For each scope, map to user attributes:

**openid scope**
- **Claim**: `sub` → user ID
- **Type**: User attribute

**profile scope**
- **Claims**: name, given_name, family_name, picture, etc.

**email scope**
- **Claim**: email

**phone scope**
- **Claim**: phone_number

---

## Step 5: Configure User Template & Signing Keys

### 5.1 Configure ID Token Template

1. Go to **Server Configuration** > **ID Token Template**
2. Configure claims to include:
   - subject identifier (sub)
   - email
   - profile
   - phone (for CIBA flows)

### 5.2 Setup Signing Certificate

1. Go to **Server Configuration** > **Signing & Encryption Certificates**
2. Create/select a certificate for ID token signing
3. Ensure algorithm is RS256 or ES256

---

## Step 6: Update Application Configuration

Update the `.env` files in your demo apps:

### TV Streaming App (.env)

```bash
# Ping Federate Configuration
PF_BASE_URL=https://your-pf-server.com:9031
PF_CLIENT_ID=tv-app-client
PF_CLIENT_SECRET=your-generated-client-secret

# Local Configuration
TV_APP_PORT=3000
IDENTITY_APP_URL=http://localhost:3001

# For Production
NODE_ENV=production
SESSION_SECRET=strong-random-secret-123
```

### Identity Verification App (.env)

```bash
# Ping Federate Configuration
PF_BASE_URL=https://your-pf-server.com:9031
PF_ADMIN_API_KEY=your-admin-api-key

# Local Configuration
IDENTITY_APP_PORT=3001
TV_APP_URL=http://localhost:3000

# For Production
NODE_ENV=production
SESSION_SECRET=another-strong-secret
```

---

## Step 7: Configure Webhook Callbacks (Optional)

For production, configure Ping Federate to send webhooks:

### 7.1 Configure Webhooks

1. Go to **Extensions** > **Webhooks** (if available)
2. Create webhooks for:
   - Device code requests: `POST http://your-app:3001/webhooks/device-code`
   - CIBA requests: `POST http://your-app:3001/webhooks/ciba`

3. Test webhook delivery:
   - Configure signing if required
   - Enable retry on failure
   - Set timeout appropriately

---

## Step 8: Test Device Code Flow

### 8.1 Complete Flow Test

```bash
# 1. Start TV App
npm run start:tv
# http://localhost:3000

# 2. Request device code
# Click "Request Device Code" button

# 3. Note the user code displayed

# 4. Visit verification endpoint in browser
https://your-pf-server:9031/pf/device-verification

# 5. Enter the user code

# 6. Authenticate with user credentials

# 7. Device should receive access token
# TV app shows "Authenticated"
```

### 8.2 Verify in TV App Console

```bash
# Monitor logs
tail -f /var/log/pf/server.log | grep device

# Check polling requests
# Should see tokens in redis/cache
redis-cli get device_code:*
```

---

## Step 9: Test CIBA Flow

### 9.1 Complete Flow Test

```bash
# 1. Start apps
npm run start:tv
npm run start:identity

# 2. TV App: enter phone number
# +1-555-123-4567

# 3. Click "Send Authentication Request"

# 4. Identity App: see CIBA request in dashboard
# http://localhost:3001/login

# 5. Click approve on the request

# 6. TV app should receive approval

# 7. TV app shows "Authenticated"
```

### 9.2 With Push Notifications

If SMS/push configured:

```bash
# 1. TV App sends CIBA request
# 2. User receives SMS/push on phone
# 3. User clicks link or app notification
# 4. Authenticates on mobile device
# 5. TV app receives approval and token
```

---

## Step 10: Production Hardening

### 10.1 Security Configuration

- [ ] Enable HTTPS/TLS
- [ ] Use strong client secrets (32+ characters)
- [ ] Enable PKCE (Proof Key for Code Exchange)
- [ ] Configure rate limiting
- [ ] Set up request signing/validation
- [ ] Enable audit logging
- [ ] Configure certificate pinning for mobile apps

### 10.2 Database Configuration

- [ ] Move from in-memory to persistent DB
- [ ] Store device codes securely
- [ ] Implement code rotation
- [ ] Add encryption for sensitive data
- [ ] Configure database backups

### 10.3 Monitoring & Logging

```bash
# Enable debug logging
export DEBUG=pf:*,express:*

# Monitor device code requests
tail -f logs/device-flow.log

# Monitor CIBA requests
tail -f logs/ciba-flow.log

# Monitor authentication events
grep "device_code\|ciba" /var/log/pf/server.log
```

### 10.4 Admin Portal Security

- [ ] Multi-factor authentication
- [ ] IP whitelisting
- [ ] Session timeouts
- [ ] Audit logging for approvals/denials
- [ ] Role-based access control

---

## Troubleshooting

### Device Code Not Working

```bash
# 1. Verify client has Device Grant permission
curl https://your-pf-server:9031/as/device_authorization.oauth2 \
  -u tv-app-client:secret \
  -X POST

# Response should include: device_code, user_code, verification_uri

# 2. Check Ping Federate logs
tail -f logs/pf-audit.log | grep device

# 3. Verify scope configuration
# Check that scopes are properly mapped
```

### CIBA Not Working

```bash
# 1. Verify channel binding
curl https://your-pf-server:9031/as/ciba \
  -u tv-app-client:secret \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "scope=openid&login_hint=%2B1-555-123-4567"

# 2. Check notification service
# Verify SMS/push provider is configured

# 3. Review user attribute mappings
# Phone number should map correctly
```

### Token Not Received

```bash
# 1. Check polling endpoint
curl https://your-pf-server:9031/as/token.oauth2 \
  -u tv-app-client:secret \
  -X POST \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=DC123"

# Response:
# - authorization_pending = user hasn't approved yet
# - access_token = approval received
# - expired_token = code expired

# 2. Verify admin approved in Identity App
# Check dashboard logs

# 3. Check device code expiration
# Ensure flow hasn't timed out
```

---

## API Key Management

### Getting Admin API Key

For webhooks and server-to-server communication:

1. In Ping Federate Admin Console:
2. Go to **System** > **API Keys**
3. Create API key:
   - **Name**: Device Demo API Key
   - **Scopes**: OAuth Administration, CIBA
4. Save the key securely

Use in header:
```bash
curl https://your-pf-server:9031/pf-admin-api/v1/... \
  -H "X-API-Key: your-api-key"
```

---

## References

- [Ping Federate OAuth 2.0 Guide](https://docs.pingidentity.com/bundle/pingfederate_61/page/pf_c_oauth_2_0_guide.html)
- [RFC 8628 - Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [OpenID Connect CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)

---

## Quick Start Checklist

- [ ] Ping Federate installed and running
- [ ] OAuth 2.0 enabled
- [ ] tv-app-client created with appropriate grants
- [ ] Device Authorization Grant enabled
- [ ] CIBA enabled
- [ ] Scopes configured (openid, profile, email, phone)
- [ ] `.env` files updated with PF URLs and credentials
- [ ] TV app running on port 3000
- [ ] Identity app running on port 3001
- [ ] Device code flow tested
- [ ] CIBA flow tested
- [ ] Admin credentials working

---

## Support

For issues:

1. Check Ping Federate logs: `/opt/pingfederate/log/`
2. Enable debug logging in demo apps
3. Verify network connectivity between apps
4. Compare request/response with RFC 8628 spec
5. Contact Ping Identity support for PF issues
