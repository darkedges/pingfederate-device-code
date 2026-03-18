/**
 * TV Streaming App - Multiple OAuth 2.0 Flows Implementation
 * Simulates a TV streaming application with user authentication
 * Supports:
 * 1. Authorization Code Grant (for /device endpoint)
 * 2. Device Code Grant (RFC 8628)
 * 3. CIBA (Customer-Initiated Backchannel Authentication)
 */

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.TV_APP_PORT || 3000;

const LOG_PREFIX = '[TV Streaming]';
const logInfo = (...args) => console.log(LOG_PREFIX, ...args);
const logWarn = (...args) => console.warn(LOG_PREFIX, ...args);
const logError = (...args) => console.error(LOG_PREFIX, ...args);

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Ping Federate Configuration
    pingFederate: {
        baseUrl: process.env.PF_BASE_URL || 'https://pingfederate.example.com',
        clientId: process.env.TV_CLIENT_ID || 'tv-app-client',
        clientSecret: process.env.TV_CLIENT_SECRET || 'secret-key-123',
    },
    // Identity Verification App (Backend verification server)
    verificationApp: {
        baseUrl: process.env.IDENTITY_APP_URL || 'http://localhost:3001',
    },
};

// ============================================
// Middleware Setup
// ============================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        name: 'tv-streaming.sid', // Avoid cookie collision with tv-station app
        secret: 'tv-app-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set true in production with HTTPS
    })
);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// ============================================
// Routes
// ============================================

/**
 * Home Page - Shows menu for Device Code Grant and CIBA flows
 */
app.get('/', (req, res) => {
    res.render('index', {
        deviceCode: req.session.deviceCode || null,
        userCode: req.session.userCode || null,
        cibaTelephone: req.session.cibaTelephone || null,
        cibaBankId: req.session.cibaBankId || null,
    });
});

/**
 * Device Code Flow - Step 1: Request Device Code
 */
app.post('/device-code/request', async (req, res) => {
    try {
        logInfo('Device code request started');

        // Call Ping Federate Device Code endpoint
        const response = await axios.post(
            `${CONFIG.pingFederate.baseUrl}/as/device_authz.oauth2`,
            new URLSearchParams({
                scope: 'openid profile email',
            }),
            {
                auth: {
                    username: CONFIG.pingFederate.clientId,
                    password: CONFIG.pingFederate.clientSecret,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { device_code, user_code, verification_uri, expires_in, interval } =
            response.data;

        // Store in session for demonstration
        req.session.deviceCode = device_code;
        req.session.userCode = user_code;
        req.session.verificationUri = verification_uri;
        req.session.expiresIn = expires_in || 1800; // 30 minutes default
        req.session.pollInterval = interval || 5; // 5 seconds default
        req.session.deviceFlowStartTime = Date.now();

        logInfo(`Device code request succeeded (userCode=${user_code})`);

        res.json({
            success: true,
            userCode: user_code,
            verificationUri: verification_uri,
            expiresIn: expires_in,
            message: `Show the user code "${user_code}" on screen. User should visit ${verification_uri} to authenticate on another device.`,
        });

        // Start automatically polling for token in background
        startDeviceCodePolling(device_code, req.session);
    } catch (error) {
        logError('Device code request failed:', error.message);

        if (error.response) {
            logError(`Response Status: ${error.response.status}`);
            logError(`Error: ${error.response.data?.error || 'unknown_error'}`);
        }

        res.status(500).json({
            success: false,
            error: error.message,
            status: error.response?.status,
            details: error.response?.data,
        });
    }
});

/**
 * Device Code Flow - Polling for Token
 * This function runs in the background and polls Ping Federate for a token
 */
function startDeviceCodePolling(deviceCode, session) {
    const pollInterval = session.pollInterval * 1000; // Convert to milliseconds
    const maxAttempts = Math.floor(session.expiresIn / session.pollInterval);
    let attempts = 0;

    const pollTimer = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
            clearInterval(pollTimer);
            logInfo('Device code polling stopped: code expired');
            return;
        }

        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
            params.append('device_code', deviceCode);
            params.append('client_id', CONFIG.pingFederate.clientId);

            const response = await axios.post(
                `${CONFIG.pingFederate.baseUrl}/as/token.oauth2`,
                params,
                {
                    auth: {
                        username: CONFIG.pingFederate.clientId,
                        password: CONFIG.pingFederate.clientSecret,
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            // Token received
            const { access_token, id_token, refresh_token, expires_in } = response.data;
            session.accessToken = access_token;
            session.idToken = id_token;
            session.refreshToken = refresh_token;
            session.tokenExpiresIn = expires_in;
            session.tokenReceivedTime = Date.now();
            session.authenticated = true;

            // Save session to persist changes
            session.save((err) => {
                if (err) {
                    logError('Session save failed:', err.message);
                }
            });

            clearInterval(pollTimer);
            logInfo('Device code authentication succeeded');
        } catch (error) {
            if (error.response?.data?.error === 'authorization_pending') {
                return;
            } else if (error.response?.data?.error === 'slow_down') {
                return;
            } else if (error.response?.data?.error === 'expired_token') {
                clearInterval(pollTimer);
                logInfo('Device code polling stopped: token expired');
            } else if (error.response?.status === 400) {
                logError(`[Device Code Poll Error 400] ${error.response.data?.error || 'bad_request'}`);
            } else {
                logError(`[Device Code Poll Error]:`, error.message);
            }
        }
    }, pollInterval);
}

/**
 * CIBA Flow - Step 1: Request Authentication with Phone Number
 */
app.post('/ciba/request', async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required',
            });
        }

        logInfo(`CIBA request started (phone=${phoneNumber})`);

        // Call Ping Federate CIBA backchannel authentication request endpoint
        const response = await axios.post(
            `${CONFIG.pingFederate.baseUrl}/as/bc-auth.ciba`,
            new URLSearchParams({
                scope: 'openid profile email',
                login_hint: phoneNumber,
            }),
            {
                auth: {
                    username: CONFIG.pingFederate.clientId,
                    password: CONFIG.pingFederate.clientSecret,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { auth_req_id, expires_in, interval } = response.data;

        // Store in session
        req.session.cibaBankId = auth_req_id;
        req.session.cibaTelephone = phoneNumber;
        req.session.cibaExpiresIn = expires_in || 600; // 10 minutes default
        req.session.cibaPollInterval = interval || 2; // 2 seconds default
        req.session.cibaStartTime = Date.now();

        logInfo(`CIBA request succeeded (authReqId=${auth_req_id})`);

        res.json({
            success: true,
            authReqId: auth_req_id,
            expiresIn: expires_in,
            interval: interval,
            message: `Authentication request sent to phone number: ${phoneNumber}. User will authenticate via push notification or mobile app.`,
        });

        // Start polling for authentication result
        startCIBAPolling(auth_req_id, req.session);
    } catch (error) {
        logError('CIBA request failed:', error.message);

        if (error.response) {
            logError(`Response Status: ${error.response.status}`);
            logError(`Error: ${error.response.data?.error || 'unknown_error'}`);
        }

        res.status(500).json({
            success: false,
            error: error.message,
            status: error.response?.status,
            details: error.response?.data,
        });
    }
});

/**
 * CIBA Flow - Polling for Authentication Result
 */
function startCIBAPolling(authReqId, session) {
    const pollInterval = session.cibaPollInterval * 1000;
    const maxAttempts = Math.floor(session.cibaExpiresIn / session.cibaPollInterval);
    let attempts = 0;

    const pollTimer = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
            clearInterval(pollTimer);
            logInfo('CIBA polling stopped: request expired');
            return;
        }

        try {
            const response = await axios.post(
                `${CONFIG.pingFederate.baseUrl}/as/token.oauth2`,
                new URLSearchParams({
                    grant_type: 'urn:openid:params:grant-type:ciba',
                    auth_req_id: authReqId,
                    client_id: CONFIG.pingFederate.clientId,
                }),
                {
                    auth: {
                        username: CONFIG.pingFederate.clientId,
                        password: CONFIG.pingFederate.clientSecret,
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const { access_token, id_token, refresh_token, expires_in } = response.data;
            session.accessToken = access_token;
            session.idToken = id_token;
            session.refreshToken = refresh_token;
            session.tokenExpiresIn = expires_in;
            session.tokenReceivedTime = Date.now();
            session.authenticated = true;

            // Save session to persist changes
            session.save((err) => {
                if (err) {
                    logError('CIBA session save failed:', err.message);
                }
            });

            clearInterval(pollTimer);
            logInfo('CIBA authentication succeeded');
        } catch (error) {
            if (error.response?.data?.error === 'auth_req_id_not_found') {
                return;
            } else if (error.response?.data?.error === 'authorization_pending') {
                return;
            } else if (error.response?.data?.error === 'slow_down') {
                return;
            } else if (error.response?.data?.error === 'expired_token') {
                clearInterval(pollTimer);
                logInfo('CIBA polling stopped: token expired');
            } else if (error.response?.status === 400) {
                logError(`[CIBA Poll Error 400] ${error.response.data?.error || 'bad_request'}`);
            } else {
                logError(`[CIBA Poll Error]:`, error.message);
            }
        }
    }, pollInterval);
}

/**
 * Check Current Authentication Status
 */
app.get('/status', (req, res) => {
    const deviceCodeTime = req.session.deviceFlowStartTime
        ? Math.floor((Date.now() - req.session.deviceFlowStartTime) / 1000)
        : null;

    const cibaTime = req.session.cibaStartTime
        ? Math.floor((Date.now() - req.session.cibaStartTime) / 1000)
        : null;

    res.json({
        authenticated: req.session.authenticated || false,
        // Device Code Flow Status
        deviceCode: {
            active: !!req.session.deviceCode,
            userCode: req.session.userCode || null,
            elapsedSeconds: deviceCodeTime,
            expiresIn: req.session.expiresIn || null,
        },
        // CIBA Flow Status
        ciba: {
            active: !!req.session.cibaBankId,
            phoneNumber: req.session.cibaTelephone || null,
            requestId: req.session.cibaBankId || null,
            elapsedSeconds: cibaTime,
            expiresIn: req.session.cibaExpiresIn || null,
        },
        // Token Info
        token: req.session.authenticated
            ? {
                hasAccessToken: !!req.session.accessToken,
                hasIdToken: !!req.session.idToken,
                expiresIn: req.session.tokenExpiresIn || null,
            }
            : null,
    });
});

/**
 * Logout
 */
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

/**
 * Get User Info (requires valid access token)
 */
app.get('/userinfo', async (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'Please complete device code or CIBA flow first',
        });
    }

    try {
        logInfo('User info fetch started');

        const response = await axios.get(
            `${CONFIG.pingFederate.baseUrl}/idp/userinfo.openid`,
            {
                headers: {
                    Authorization: `Bearer ${req.session.accessToken}`,
                },
            }
        );

        logInfo('User info fetch succeeded');
        res.json({
            success: true,
            userInfo: response.data,
        });
    } catch (error) {
        logError('User info fetch failed:', error.message);

        if (error.response) {
            logError(`  Status: ${error.response.status}`);
            logError(`  Error: ${error.response.data?.error || 'unknown_error'}`);
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to fetch user information',
            endpoint: `${CONFIG.pingFederate.baseUrl}/idp/userinfo.openid`,
            details: error.response?.data,
        });
    }
});

/**
 * Debug: Try alternative userinfo endpoints
 */
app.get('/userinfo/debug', async (req, res) => {
    if (!req.session.authenticated) {
        return res.status(401).json({
            error: 'Not authenticated',
            message: 'Please complete device code or CIBA flow first',
        });
    }

    const endpoints = [
        '/idp/userinfo.openid',
        '/as/userinfo.oauth2',
        '/as/userinfo',
        '/oidc/userinfo.oauth2',
        '/oauth2/userinfo.oauth2',
        '/userinfo.oauth2',
        '/userinfo',
    ];

    const results = [];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(
                `${CONFIG.pingFederate.baseUrl}${endpoint}`,
                {
                    headers: {
                        Authorization: `Bearer ${req.session.accessToken}`,
                    },
                }
            );
            results.push({
                endpoint,
                status: 'SUCCESS ✓',
                data: response.data,
            });
        } catch (error) {
            results.push({
                endpoint,
                status: error.response?.status || error.message,
            });
        }
    }

    res.json({
        message: 'Tested all userinfo endpoints',
        accessToken: req.session.accessToken ? req.session.accessToken.substring(0, 20) + '...' : 'NONE',
        results,
    });
});

// ============================================
// Error Handling
// ============================================
app.use((err, req, res, next) => {
    logError('Unhandled server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// ============================================
// Server Start
// ============================================
app.listen(PORT, () => {
    logInfo(`
╔════════════════════════════════════════════════════════╗
║  TV Streaming App - Device Code & CIBA Demo            ║
║  Port: ${PORT}                                        ║
║  Ping Federate URL: ${CONFIG.pingFederate.baseUrl}  ║
║  Identity App URL: ${CONFIG.verificationApp.baseUrl}   ║
╚════════════════════════════════════════════════════════╝
  `);
    logInfo(`Open http://localhost:${PORT} in your browser`);
});

module.exports = app;
