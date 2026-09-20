import { createClient } from "@neondatabase/neon-js";

// Public Better Auth base URL for this Neon project. This is not a secret —
// it's the same value used as VITE_NEON_AUTH_URL in Neon's own quickstart —
// so it's fine to commit directly rather than load from an env var that
// this build-less-at-runtime bundle has no way to inject anyway.
const NEON_AUTH_URL = "https://ep-icy-art-zagl83mw.neonauth.c-2.eu-west-2.aws.neon.tech/neondb/auth";

const client = createClient({
    auth: {
        url: NEON_AUTH_URL
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
export async function getAccessToken() {
    const { data, error } = await auth.token();

    if (error) {
        throw error;
    }

    return data.token;
}
