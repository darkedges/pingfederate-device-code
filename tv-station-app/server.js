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
app.use(
    session({
        secret: process.env.STATION_SESSION_SECRET || 'tv-station-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set true in production with HTTPS
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

    console.log('Redirecting to Ping Federate authorization endpoint:', authUrl.toString());
    res.redirect(authUrl.toString());
});

/**
 * Authorization Code Grant Flow - Step 2: Handle Authorization Code
 * Called by Ping Federate with authorization code
 */
app.get('/auth/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Validate state parameter
    if (!state || state !== req.session.oauthState) {
        console.error('Invalid state parameter - possible CSRF attack');
        return res.status(400).send('Invalid state parameter');
    }

    if (error) {
        console.error('Authorization server error:', error, req.query.error_description);
        return res.status(400).send(`Authorization error: ${error}`);
    }

    if (!code) {
        console.error('No authorization code received');
        return res.status(400).send('No authorization code received');
    }

    try {
        console.log('Exchanging authorization code for access token...');

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
            console.log('✓ User authenticated via Authorization Code Grant');
            console.log(
                `  User: ${
                    userInfoResponse.data.preferred_username ||
                    userInfoResponse.data.email ||
                    userInfoResponse.data.sub
                }`
            );
        } catch (userInfoError) {
            console.warn('Could not fetch user info:', userInfoError.message);
            // Still mark as authenticated even if userinfo fails
            req.session.authCodeAuthenticatedUser = { sub: 'user' };
        }

        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err.message);
                return res.status(500).send('Session error');
            }

            // Redirect to the originally requested page or /device
            const redirectUrl = req.session.redirectAfterLogin || '/device';
            res.redirect(redirectUrl);
        });
    } catch (error) {
        console.error('Error exchanging authorization code:', error.message);

        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data:`, error.response.data);
        }

        res.status(500).send('Authentication failed');
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

    if (!userCode) {
        return res.status(400).json({
            success: false,
            error: 'User code is required',
        });
    }

    try {
        console.log(`Submitting device code to Ping Federate: ${userCode}`);

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
            }
        );

        console.log('✓ Device code authorized successfully');
        console.log('  Response:', response.data);

        req.session.deviceCodeAuthzResult = {
            success: true,
            userCode: userCode,
            timestamp: new Date().toISOString(),
            response: response.data,
        };

        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err.message);
            }
        });

        res.json({
            success: true,
            message: 'Device code authorized successfully',
            details: response.data,
        });
    } catch (error) {
        console.error('Error authorizing device code:', error.message);

        if (error.response) {
            console.error(`  Status: ${error.response.status}`);
            console.error(`  Data:`, error.response.data);
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to authorize device code',
            details: error.response?.data,
        });
    }
});

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
            console.error('Error clearing session:', err.message);
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
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// ============================================
// Server Start
// ============================================
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  TV Station App - Authorization Code Grant             ║
║  Port: ${PORT}                                        ║
║  Ping Federate URL: ${CONFIG.pingFederate.baseUrl}  ║
║  TV Streaming App: ${CONFIG.app.tvStreamingAppUrl}     ║
╚════════════════════════════════════════════════════════╝
  `);
    console.log(`Open http://localhost:${PORT} in your browser`);
});

module.exports = app;
