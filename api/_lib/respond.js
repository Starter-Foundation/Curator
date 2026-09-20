export function withHandler(handler) {
    return async function(request, response) {
        try {
            await handler(request, response);
        } catch (error) {
            const statusCode = error.statusCode || 500;

            if (statusCode === 500) {
                console.error(error);
            }

            response.status(statusCode).json({ error: error.message || "Internal server error" });
        }
    };
}
