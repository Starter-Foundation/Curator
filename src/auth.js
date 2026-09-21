import { createClient } from "@neondatabase/neon-js";

// Routed through our own /api/auth/* proxy (see api/auth/proxy.js)
// rather than Neon's own neonauth.*.neon.tech domain directly. Neon Auth's
// session cookie would otherwise be a third-party cookie from the browser's
// perspective — which Safari has long blocked and Chrome/Edge are
// increasingly blocking too — silently losing the session on every reload.
// Proxying through this domain makes it a first-party cookie instead.
const client = createClient({
    auth: {
        url: `${window.location.origin}/api/auth`
    },
    dataApi: {
        // Never dereferenced: this app queries Postgres via its own /api/*
        // routes (src/api.js), not neon-js's Data API/postgrest client.
        // createClient's object-config form requires a dataApi block
        // regardless (it unconditionally reads dataApi.options internally).
        url: `${window.location.origin}/api/data-api-unused`
    }
});

export const auth = client.auth;

export async function signUpWithEmail(email, password, name) {
    return auth.signUp.email({ email, password, name });
}

export async function signInWithEmail(email, password) {
    return auth.signIn.email({ email, password });
}

export async function signOut() {
    cachedToken = null;
    cachedTokenExpiresAt = 0;
    return auth.signOut();
}

export async function getSession() {
    return auth.getSession();
}

let cachedToken = null;
let cachedTokenExpiresAt = 0;

// Returns a short-lived JWT to attach as "Authorization: Bearer <token>" on
// requests to our own /api/* routes (see api/_lib/auth.js, which verifies
// this same token against Neon Auth's JWKS endpoint).
//
// Calls the proxy's /token route directly with a plain fetch rather than
// the client's own auth.token() (the Better Auth JWT plugin's client
// method): that method sometimes resolves with a locally-cached,
// session-shaped object from a prior sign-in/sign-up response instead of
// actually calling /token, which has no top-level `token` field — so
// getAccessToken() silently returned undefined and every API call failed
// with "Invalid or expired token". A direct fetch here always hits the
// real endpoint.
//
// The resulting token is cached in memory until shortly before it expires,
// since every apiFetch() call (see src/api.js) invokes this — without
// caching, even loading the campaign list costs two sequential network
// round trips (one for the token, one for the actual request) instead of
// one, and that doubles up again for every subsequent action.
export async function getAccessToken() {
    if (cachedToken && Date.now() < cachedTokenExpiresAt) {
        return cachedToken;
    }

    const response = await fetch(`${window.location.origin}/api/auth/token`);

    if (!response.ok) {
        throw new Error("Failed to get access token");
    }

    const { token } = await response.json();
    const { exp } = JSON.parse(atob(token.split(".")[1]));

    cachedToken = token;
    cachedTokenExpiresAt = exp * 1000 - 30_000;

    return cachedToken;
}

// Calls the proxy's underlying Better Auth routes directly with a plain
// fetch, same reasoning as getAccessToken() above: the wrapped client
// object only documents signIn/signUp/signOut/getSession, so update-user/
// change-email/change-password aren't reliably exposed as client methods.
// These endpoints are session-cookie-authenticated (the proxy forwards
// cookies both ways - see api/auth/proxy.js), so no bearer token is needed.
async function authProxyFetch(path, body) {
    const response = await fetch(`${window.location.origin}/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(function() {
        return null;
    });

    if (!response.ok) {
        throw new Error((data && (data.message || data.error)) || "Request failed. Please try again.");
    }

    return data;
}

export async function updateProfileName(name) {
    return authProxyFetch("update-user", { name });
}

export async function updateEmail(newEmail) {
    return authProxyFetch("change-email", { newEmail });
}

export async function changePassword(currentPassword, newPassword) {
    return authProxyFetch("change-password", { currentPassword, newPassword });
}
