import { createClient } from "@neondatabase/neon-js";

// Public base URL for this Neon project — not a secret, same value used as
// VITE_NEON_AUTH_URL's source in Neon's own quickstart — so it's fine to
// commit directly rather than load from an env var that this
// build-less-at-runtime bundle has no way to inject anyway.
//
// Passed as a single string (rather than `{ auth: { url } }`) so neon-js
// derives both the auth and Data API URLs itself: its object-config form
// requires a `dataApi` block even though this app never queries the Data
// API (createClient's internal code dereferences `dataApi.options`
// unconditionally, throwing "Cannot read properties of undefined" if it's
// omitted). The derived auth URL is
// https://ep-icy-art-zagl83mw.neonauth.c-2.eu-west-2.aws.neon.tech/neondb/auth.
const NEON_BASE_URL = "https://ep-icy-art-zagl83mw.c-2.eu-west-2.aws.neon.tech/neondb";

const client = createClient(NEON_BASE_URL);

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
export async function getAccessToken() {
    const { data, error } = await auth.token();

    if (error) {
        throw error;
    }

    return data.token;
}
