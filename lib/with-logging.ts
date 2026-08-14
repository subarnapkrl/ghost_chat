import { getCorrelationId, log } from "./logger";

type RouteHandler = (
  req: Request,
  ctx: { params: Record<string, string> },
) => Promise<Response>;

export function withLogging(
  routeName: string,
  handler: RouteHandler,
): RouteHandler {
  return async (req, ctx) => {
    const correlationId = getCorrelationId(req);
    const start = Date.now();
    let status = 500;

    try {
      const res = await handler(req, ctx);
      status = res.status;
      res.headers.set("x-correlation-id", correlationId);
      return res;
    } finally {
      log("http:response", {
        route: routeName,
        method: req.method,
        status,
        durationMs: Date.now() - start,
        correlationId,
      });
    }
  };
}
