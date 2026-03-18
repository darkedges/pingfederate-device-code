# TV Station App - Troubleshooting Guide

## Network Error: Failed to Fetch

When you see "Network error: Failed to fetch" or similar errors, it means the TV Station App cannot communicate with Ping Federate or there's a connectivity issue.

### Error Message Improvements

The app now displays detailed error information including:
- **Error Code**: What went wrong
- **Troubleshooting Tips**: Specific steps to fix the issue
- **HTTP Status**: Server response code
- **Response Details**: Full error data from Ping Federate

### Common Network Errors and Solutions

#### 1. **Connection Refused - ECONNREFUSED**
```
Cannot connect to Ping Federate
Server cannot reach https://id.ping.darkedges.com/as/user_authz.oauth2
```

**Causes:**
- Ping Federate is not running
- Ping Federate hostname/port is wrong
- Network connectivity issue

**Solutions:**
1. Verify Ping Federate is running: `https://id.ping.darkedges.com/`
2. Check `PF_BASE_URL` in `.env` is correct
3. Ensure your machine can reach the Ping Federate server (ping, nslookup, tracert)
4. Check firewall rules allowing outbound HTTPS to Ping Federate

#### 2. **Host Not Found - ENOTFOUND**
```
Cannot resolve Ping Federate hostname
Cannot resolve hostname: https://id.ping.darkedges.com
```

**Causes:**
- DNS resolution failed
- Hostname is misspelled
- DNS server is not responding

**Solutions:**
1. Test DNS: `nslookup id.ping.darkedges.com`
2. Check `PF_BASE_URL` spelling in `.env`
3. Try using IP address instead: `PF_BASE_URL=https://192.168.1.100:9031`
4. Check your DNS settings (try `8.8.8.8` or `1.1.1.1`)

#### 3. **Request Timeout - ETIMEDOUT**
```
Request timeout
Ping Federate did not respond within 10 seconds
```

**Causes:**
- Ping Federate is slow or overloaded
- Network latency is too high
- Connection is being blocked/throttled

**Solutions:**
1. Wait a bit and try again
2. Check Ping Federate logs for performance issues
3. Check network connectivity: `ping id.ping.darkedges.com`
4. Try accessing Ping Federate directly in your browser

#### 4. **Invalid Response from Server**
```
Invalid Response from Server
Status: 500
Response: ...
```

**Causes:**
- TV Station App server crashed
- TV Station App has an application error
- There's an issue with the middleware

**Solutions:**
1. Check TV Station App console for error messages
2. Restart the TV Station App: `npm run dev:station`
3. Check logs for any JavaScript errors
4. Verify `.env` file has all required variables

#### 5. **HTTP 401 - Unauthorized**
```
Error: HTTP 401: Unauthorized
Hint: Client authentication failed. Check credentials.
```

**Causes:**
- `STATION_CLIENT_ID` or `STATION_CLIENT_SECRET` is wrong
- Client credentials are not configured in Ping Federate

**Solutions:**
1. Verify credentials in Ping Federate Admin Console:
   - Go to OAuth 2.0 > Clients
   - Find `tv-station-client`
   - Check client ID and secret match `.env`
2. Update `.env`:
   ```env
   STATION_CLIENT_ID=tv-station-client
   STATION_CLIENT_SECRET=<correct-secret>
   ```
3. Restart the TV Station App

#### 6. **HTTP 404 - Endpoint Not Found**
```
Error: HTTP 404: Not Found
Hint: Endpoint not found. Verify Ping Federate configuration.
```

**Causes:**
- Device Code Grant is not enabled
- Endpoint path is wrong for your Ping Federate version
- Ping Federate addon/capability is not installed

**Solutions:**
1. Verify Device Code Grant is enabled in Ping Federate:
   - Admin Console > Server Configuration > Device Authorization Grant
2. Check the endpoint path for your version:
   - PF 12.3+: `/as/user_authz.oauth2` ✓
   - Other versions may differ
3. Ensure Device Authorization Grant addon is installed

#### 7. **Generic "Network error"**
```
Network error: [specific error message]
This could mean:
- The server is not responding
- The server crashed or restarted
- Your connection was interrupted
- There's a CORS issue
```

**Solutions:**
1. Refresh the page and try again
2. Check server console for errors
3. Verify TV Station App is still running
4. Check browser console (F12) for additional error details
5. Check network tab to see if request was sent and what response was received

### Debugging Steps

#### 1. Check TV Station App is Running
```powershell
npm run dev:station
```
Look for startup messages confirming the app is listening on port 3001.

#### 2. Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Go to Network tab
5. Click "Authorize Device" button
6. Look at the failed request for details:
   - Status code
   - Response body
   - Request headers

#### 3. Check TV Station App Logs
Watch the terminal running:
```powershell
npm run dev:station
```

Look for:
- Successful POST requests
- Error messages with stack traces
- Connection errors to Ping Federate

#### 4. Test Connectivity to Ping Federate
```powershell
# Test if host is reachable
ping id.ping.darkedges.com

# Resolve hostname
nslookup id.ping.darkedges.com

# Test HTTPS connection
Invoke-WebRequest -Uri "https://id.ping.darkedges.com/" -SkipCertificateCheck
```

#### 5. Test the Endpoint Directly
Use curl or Postman to test the endpoint manually:
```bash
curl -X POST \
  "https://id.ping.darkedges.com/as/user_authz.oauth2" \
  -u "tv-station-client:client-secret" \
  -d "user_code=TEST1234" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### Configuration Checklist

- [ ] `PF_BASE_URL` is set correctly in `.env`
- [ ] `STATION_CLIENT_ID` matches Ping Federate client name
- [ ] `STATION_CLIENT_SECRET` matches Ping Federate client secret
- [ ] TV Station App is running: `npm run dev:station`
- [ ] Port 3001 is not blocked by firewall
- [ ] Can ping Ping Federate server
- [ ] Device Code Grant is enabled in Ping Federate
- [ ] Client is configured with correct redirect URI
- [ ] Client has proper scopes configured

### Getting More Help

If the problem persists:

1. **Collect diagnostic information:**
   ```powershell
   # Ping Federate connectivity
   nslookup id.ping.darkedges.com
   Invoke-WebRequest -Uri "https://id.ping.darkedges.com/" -SkipCertificateCheck -ErrorAction Ignore
   
   # TV Station App logs
   npm run dev:station 2>&1 | Tee-Object -FilePath app.log
   ```

2. **Check Ping Federate logs** (in Ping Federate admin console or `/pf/log/`)

3. **Provide server output** when reporting issues

### Performance Optimization

If requests are timing out frequently:

1. Increase timeout in `server.js`:
   ```javascript
   timeout: 30000, // 30 seconds instead of 10
   ```

2. Check Ping Federate server resources (CPU, Memory, Disk)

3. Move TV Station App closer to Ping Federate (reduce latency)

4. Load balance Ping Federate if multiple instances

### Security Notes

- Never expose credentials in browser console or logs
- Always use HTTPS in production
- Validate environment variables before startup
- Monitor failed authorization attempts
- Use separate client credentials for different environments
