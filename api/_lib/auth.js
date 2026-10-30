import { createRemoteJWKSet, jwtVerify } from "jose";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
const JWKS = createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`), {
    timeoutDuration: 10_000
});

// jose errors that mean the signing keys couldn't be fetched (timeout, a
// non-200 or unparseable response) rather than that the token is bad. A
// network failure is a plain TypeError with no code at all.
const KEY_FETCH_ERROR_CODES = ["ERR_JWKS_TIMEOUT", "ERR_JWKS_INVALID", "ERR_JOSE_GENERIC"];

function isKeyFetchError(error) {
    return !error.code || KEY_FETCH_ERROR_CODES.includes(error.code);
}

// Verifies a bearer token against Neon Auth's JWKS endpoint and returns the
// caller's user id (the token's "sub" claim). Shared by requireUserId()
// below (reads the token from a normal request's headers) and the Blob
// upload route (api/campaigns/[id]/map-upload.js), which instead receives
// the token via clientPayload since @vercel/blob's upload() doesn't support
// attaching custom headers to its token-request call.
export async function verifyAccessToken(token) {
    if (!token) {
        throw unauthorized("Missing bearer token");
    }

    let payload;

    try {
        ({ payload } = await jwtVerify(token, JWKS, {
            issuer: new URL(NEON_AUTH_URL).origin
        }));
    } catch (error) {
        // Not the user's fault, and worth retrying - don't tell them their
        // sign-in is invalid.
        if (isKeyFetchError(error)) {
            console.error("Couldn't fetch Neon Auth's signing keys:", error);
            throw Object.assign(
                new Error("Couldn't reach the sign-in service to check your session. Please try again."),
                { statusCode: 503 }
            );
        }

        throw unauthorized("Invalid or expired token");
    }

    if (!payload.sub) {
        throw unauthorized("Token missing subject");
    }

    return payload.sub;
}

// Every route calls this instead of trusting any client-supplied user id.
export async function requireUserId(request) {
    const authHeader = request.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    return verifyAccessToken(token);
}

function unauthorized(message) {
    return Object.assign(new Error(message), { statusCode: 401 });
}
