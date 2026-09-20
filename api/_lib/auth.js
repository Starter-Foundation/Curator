import { createRemoteJWKSet, jwtVerify } from "jose";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
const JWKS = createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`));

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
