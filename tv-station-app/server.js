/**
 * TV Station App - Authorization Code Grant with Device Code Authorization
 * Protected endpoint for granting device code access after user authentication
 * Users must login via Authorization Code Grant before accessing the /device endpoint
 */

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.TV_STATION_APP_PORT || 3001;

const LOG_PREFIX = '[TV Station]';
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
        clientId: process.env.STATION_CLIENT_ID || 'tv-station-client',
        clientSecret: process.env.STATION_CLIENT_SECRET || 'secret-key-456',
    },
    // App Configuration
    app: {
        baseUrl: process.env.STATION_APP_BASE_URL || 'http://localhost:3001',
        tvStreamingAppUrl: process.env.TV_STREAMING_APP_URL || 'http://localhost:3000',
    },
};

// ============================================
// Middleware Setup
// ============================================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session secret for signing session cookie ID
const sessionSecret = process.env.STATION_SESSION_SECRET || 'tv-station-secret';

app.use(
    session({
        name: 'tv-station.sid', // Avoid cookie collision with other localhost apps
        secret: sessionSecret,
        resave: false, // Don't save if session hasn't changed
        saveUninitialized: false, // Only create session when data exists
        rolling: false,
        cookie: {
            secure: false, // Set true in production with HTTPS
            httpOnly: true,
            sameSite: 'Lax', // Allow credentials in same-site requests
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// ============================================
// Middleware - Authentication Check
// ============================================
const requireAuthCodeFlow = (req, res, next) => {
    if (req.session.authCodeAccessToken && req.session.authCodeAuthenticatedUser) {
        return next();
    }

    logInfo('Auth check failed: redirecting to login');
    // Redirect to login
    res.redirect('/auth/login?redirect=/device');
};

// ============================================
// Routes
// ============================================

/**
 * Home Page - Shows login button and authentication status
 */
app.get('/', (req, res) => {
    res.render('home', {
        isAuthenticated: !!req.session.authCodeAccessToken,
        user: req.session.authCodeAuthenticatedUser || {},
        tvStreamingAppUrl: CONFIG.app.tvStreamingAppUrl,
    });
});

/**
 * Authorization Code Grant Flow - Step 1: Initiate Login
 * Redirects user to Ping Federate authorization endpoint
 */
app.get('/auth/login', (req, res) => {
    // Generate a state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);
    req.session.oauthState = state;
    req.session.redirectAfterLogin = req.query.redirect || '/device';

    // Build authorization URL
    const authUrl = new URL(`${CONFIG.pingFederate.baseUrl}/as/authorization.oauth2`);
    authUrl.searchParams.append('client_id', CONFIG.pingFederate.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid profile email');
    authUrl.searchParams.append('redirect_uri', `${CONFIG.app.baseUrl}/auth/callback`);
    authUrl.searchParams.append('state', state);

    logInfo('Authorization redirect started:', authUrl.toString());
    res.redirect(authUrl.toString());
});

/**
 * Authorization Code Grant Flow - Step 2: Handle Authorization Code
 * Called by Ping Federate with authorization code
 */
app.get('/auth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Validate state parameter
    if (!state || state !== req.session.oauthState) {
        logError('Authorization callback failed: invalid state parameter');
        return res.status(400).render('error', {
            error: 'invalid_state',
            error_description: 'The state parameter is invalid or missing. This could indicate a security issue.',
            state,
            clientId: CONFIG.pingFederate.clientId,
            redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
        });
    }

    // Handle authorization errors from Ping Federate
    if (error) {
        logError('Authorization callback failed: provider returned error', error, error_description);
        return res.status(400).render('error', {
            error: error || 'UNKNOWN_ERROR',
            error_description: error_description || 'An unknown error occurred during authentication',
            state: state,
            clientId: CONFIG.pingFederate.clientId,
            redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
        });
    }

    // No authorization code received
    if (!code) {
        logError('Authorization callback failed: missing authorization code');
        return res.status(400).render('error', {
            error: 'no_code',
            error_description: 'No authorization code was received from Ping Federate. The authorization request may have been interrupted.',
            state: state,
            clientId: CONFIG.pingFederate.clientId,
            redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
        });
    }

    try {
        logInfo('Token exchange started');

        // Exchange authorization code for access token
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', `${CONFIG.app.baseUrl}/auth/callback`);
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

        const { access_token, id_token, refresh_token, expires_in } = response.data;

        // Store tokens in session
        req.session.authCodeAccessToken = access_token;
        req.session.authCodeIdToken = id_token;
        req.session.authCodeRefreshToken = refresh_token;
        req.session.authCodeTokenExpiresIn = expires_in;

        // Fetch user information
        try {
            const userInfoResponse = await axios.get(
                `${CONFIG.pingFederate.baseUrl}/idp/userinfo.openid`,
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                }
            );
            req.session.authCodeAuthenticatedUser = userInfoResponse.data;
            logInfo('User info fetch succeeded');
            logInfo(
                `  User: ${userInfoResponse.data.preferred_username ||
                userInfoResponse.data.email ||
                userInfoResponse.data.sub
                }`
            );
        } catch (userInfoError) {
            logWarn('User info fetch failed, continuing with fallback user:', userInfoError.message);
            // Still mark as authenticated even if userinfo fails
            req.session.authCodeAuthenticatedUser = { sub: 'user' };
        }

        req.session.save((err) => {
            if (err) {
                logError('Session save failed:', err.message);
                return res.status(500).render('error', {
                    error: 'session_error',
                    error_description: 'Failed to save session data. Please try again.',
                    clientId: CONFIG.pingFederate.clientId,
                    redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
                });
            }

            logInfo(`Auth callback succeeded (sessionId=${req.sessionID})`);

            // Redirect to the originally requested page or /device
            const redirectUrl = req.session.redirectAfterLogin || '/device';
            res.redirect(redirectUrl);
        });
    } catch (error) {
        logError('Token exchange failed:', error.message);

        if (error.response) {
            logError(`  Status: ${error.response.status}`);
            logError(`  Error: ${error.response.data?.error || 'unknown_error'}`);

            return res.status(error.response.status).render('error', {
                error: error.response.data?.error || 'token_error',
                error_description:
                    error.response.data?.error_description ||
                    `Failed to exchange authorization code (Status: ${error.response.status})`,
                clientId: CONFIG.pingFederate.clientId,
                redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
            });
        }

        res.status(500).render('error', {
            error: 'server_error',
            error_description: `Authentication failed: ${error.message}`,
            clientId: CONFIG.pingFederate.clientId,
            redirectUri: `${CONFIG.app.baseUrl}/auth/callback`,
        });
    }
});

/**
 * Protected Device Endpoint - Requires Authorization Code Grant authentication
 * User can enter device code and authorize via POST to /as/user_authz.oauth2
 */
app.get('/device', requireAuthCodeFlow, (req, res) => {
    res.render('device', {
        user: req.session.authCodeAuthenticatedUser || {},
        deviceCodeResult: req.session.deviceCodeAuthzResult || null,
    });
});

/**
 * POST to User Authorization Endpoint
 * Submits device code to Ping Federate for user authorization
 */
app.post('/device/authorize', requireAuthCodeFlow, async (req, res) => {
    const { userCode } = req.body;

    logInfo(`Device authorization started (sessionId=${req.sessionID})`);

    if (!userCode) {
        return res.status(400).json({
            success: false,
            error: 'User code is required',
        });
    }

    try {
        logInfo('Submitting device code to Ping Federate');

        // POST to Ping Federate user authorization endpoint
        const response = await axios.post(
            `${CONFIG.pingFederate.baseUrl}/as/user_authz.oauth2`,
            new URLSearchParams({
                user_code: userCode,
            }),
            {
                auth: {
                    username: CONFIG.pingFederate.clientId,
                    password: CONFIG.pingFederate.clientSecret,
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000, // 10 second timeout
            }
        );

        logInfo('Device authorization succeeded');
        logInfo(`  Status: ${response.status}`);

        req.session.deviceCodeAuthzResult = {
            success: true,
            userCode: userCode,
            timestamp: new Date().toISOString(),
            response: response.data,
        };

        req.session.save((err) => {
            if (err) {
                logError('Session save failed:', err.message);
            }
        });

        res.json({
            success: true,
            message: 'Device code authorized successfully',
            details: response.data,
        });
    } catch (error) {
        logError('Device authorization failed:', error.message);

        let errorDetails = {
            success: false,
            error: 'Failed to authorize device code',
        };

        // Handle different types of errors
        if (error.response) {
            // Ping Federate responded with an error
            logError(`  HTTP Status: ${error.response.status}`);
            logError(`  Error: ${error.response.data?.error || 'unknown_error'}`);

            errorDetails.error = error.response.data?.error || `HTTP ${error.response.status}: ${error.response.statusText}`;
            errorDetails.details = error.response.data;
            errorDetails.hint = getErrorHint(error.response.status, error.response.data);

            return res.status(error.response.status).json(errorDetails);
        } else if (error.code === 'ECONNREFUSED') {
            // Cannot connect to Ping Federate
            logError('Ping Federate connection refused');
            errorDetails.error = 'Cannot connect to Ping Federate';
            errorDetails.hint = `Server cannot reach ${CONFIG.pingFederate.baseUrl}/as/user_authz.oauth2. Check if Ping Federate is running and accessible.`;
            return res.status(500).json(errorDetails);
        } else if (error.code === 'ENOTFOUND') {
            // DNS resolution failed
            logError('Ping Federate DNS resolution failed');
            errorDetails.error = 'Cannot resolve Ping Federate hostname';
            errorDetails.hint = `Cannot resolve hostname: ${CONFIG.pingFederate.baseUrl}. Check your PF_BASE_URL configuration.`;
            return res.status(500).json(errorDetails);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            // Timeout
            logError('Ping Federate request timed out');
            errorDetails.error = 'Request timeout';
            errorDetails.hint = `Ping Federate did not respond within 10 seconds. The server may be overloaded or offline.`;
            return res.status(504).json(errorDetails);
        } else if (error.message.includes('CORS')) {
            // CORS error
            logError('CORS validation failed');
            errorDetails.error = 'CORS error communicating with Ping Federate';
            errorDetails.hint = 'This is a server-side CORS issue. Contact your administrator.';
            return res.status(500).json(errorDetails);
        } else {
            // Generic error
            logError(`  Error type: ${error.code || 'UNKNOWN'}`);
            logError(`  Message: ${error.message}`);
            errorDetails.error = error.message || 'Unknown error occurred';
            errorDetails.errorType = error.code || 'UNKNOWN';
            return res.status(500).json(errorDetails);
        }
    }
});

/**
 * Helper function to provide hints based on error code
 */
function getErrorHint(statusCode, responseData) {
    if (statusCode === 400) {
        const errorCode = responseData?.error;
        if (errorCode === 'invalid_request') {
            return 'The request is invalid. Check the user code format.';
        } else if (errorCode === 'invalid_code') {
            return 'The device code is invalid or expired. Request a new one.';
        }
    }
    if (statusCode === 401) {
        return 'Client authentication failed. Check STATION_CLIENT_ID and STATION_CLIENT_SECRET in .env';
    }
    if (statusCode === 404) {
        return 'Endpoint not found. Verify Ping Federate configuration and Device Code Grant is enabled.';
    }
    return null;
}

/**
 * Logout - Clear session
 */
app.post('/auth/logout', (req, res) => {
    req.session.authCodeAccessToken = null;
    req.session.authCodeIdToken = null;
    req.session.authCodeRefreshToken = null;
    req.session.authCodeAuthenticatedUser = null;
    req.session.deviceCodeAuthzResult = null;

    req.session.save((err) => {
        if (err) {
            logError('Session clear failed:', err.message);
        }
        res.redirect('/');
    });
});

/**
 * API Endpoint - Get current user info
 */
app.get('/api/user', requireAuthCodeFlow, (req, res) => {
    res.json({
        authenticated: true,
        user: req.session.authCodeAuthenticatedUser,
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
║  TV Station App - Authorization Code Grant             ║
║  Port: ${PORT}                                        ║
║  Ping Federate URL: ${CONFIG.pingFederate.baseUrl}  ║
║  TV Streaming App: ${CONFIG.app.tvStreamingAppUrl}     ║
╚════════════════════════════════════════════════════════╝
  `);
    logInfo(`Open http://localhost:${PORT} in your browser`);
});

module.exports = app;
