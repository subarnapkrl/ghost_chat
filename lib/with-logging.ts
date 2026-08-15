import { getCorrelationId, log } from "./logger";

type RouteHandler<T = Record<string, string>> = (
  req: Request,
  ctx: { params: Promise<T> },
) => Promise<Response>;

export function withLogging<T = Record<string, string>>(
  routeName: string,
  handler: RouteHandler<T>,
): RouteHandler<T> {
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
