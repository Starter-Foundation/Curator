import { handleAuthProxyRequest } from "@neondatabase/auth/server";
import { withHandler } from "../_lib/respond.js";

// Proxies /api/auth/* to Neon Auth's own server, so the session cookie is
// set by *this* domain (first-party) instead of Neon's separate
// neonauth.*.neon.tech domain. Browsers increasingly block or clear
// third-party cookies (Safari always has, Chrome/Edge are rolling it out),
// which broke session persistence across page reloads when the frontend
// talked to Neon Auth directly — see src/auth.js.
const NEON_AUTH_URL = "https://ep-icy-art-zagl83mw.neonauth.c-2.eu-west-2.aws.neon.tech/neondb/auth";

// Disable Vercel's automatic JSON body parsing: the toolkit forwards the
// request body verbatim to Neon Auth for upstream signature/shape
// validation, and a pre-parsed-then-reserialized body can differ from the
// original bytes.
export const config = {
    api: {
        bodyParser: false
    }
};

export default withHandler(async function handler(request, response) {
    const path = Array.isArray(request.query.path) ? request.query.path.join("/") : (request.query.path || "");

    const fetchResponse = await handleAuthProxyRequest({
        request: await toFetchRequest(request),
        path,
        baseUrl: NEON_AUTH_URL,
        cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET,
        sameSite: "lax"
    });

    response.status(fetchResponse.status);

    for (const [key, value] of fetchResponse.headers) {
        if (key.toLowerCase() === "set-cookie") {
            continue;
        }

        response.setHeader(key, value);
    }

    // Headers.prototype.get() comma-joins multiple Set-Cookie values, which
    // corrupts the Expires attribute's embedded comma — getSetCookie() keeps
    // them as separate values, which is required here.
    response.setHeader("set-cookie", fetchResponse.headers.getSetCookie());
    response.end(Buffer.from(await fetchResponse.arrayBuffer()));
});

async function toFetchRequest(request) {
    const protocol = request.headers["x-forwarded-proto"] || "http";
    const host = request.headers.host || "localhost";
    const url = new URL(request.url, `${protocol}://${host}`);

    const headers = { ...request.headers };

    // Same-origin browser GETs (get-session, token) often omit Origin, but
    // Neon Auth requires it for CSRF/trusted-origin checks on every request.
    // It's always safe to fill in with our own resolved origin here, since a
    // same-origin call to /api/auth/* genuinely originates from this app.
    if (!headers.origin) {
        headers.origin = `${protocol}://${host}`;
    }

    const init = {
        method: request.method,
        headers
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
        const chunks = [];

        for await (const chunk of request) {
            chunks.push(chunk);
        }

        let body = Buffer.concat(chunks);

        // `vercel dev` drains the request stream to populate `request.body`
        // even with bodyParser disabled (that config only applies to real
        // deployments), leaving nothing for the read above — re-serialize
        // the already-parsed body in that case so local dev still forwards
        // a real payload upstream.
        if (body.length === 0 && request.body && typeof request.body === "object") {
            body = Buffer.from(JSON.stringify(request.body));
        }

        if (body.length > 0) {
            init.body = body;
            init.duplex = "half";
        }
    }

    return new Request(url, init);
}
