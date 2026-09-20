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
    return auth.signOut();
}

export async function getSession() {
    return auth.getSession();
}

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
export async function getAccessToken() {
    const response = await fetch(`${window.location.origin}/api/auth/token`);

    if (!response.ok) {
        throw new Error("Failed to get access token");
    }

    const { token } = await response.json();
    return token;
}
