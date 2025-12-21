import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	base: null, // don't add pid/hostname by default
});

/**
 * Logs one line per request with duration and requestId.
 */
export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
	const start = Date.now();

	res.on('finish', () => {
		const durationMs = Date.now() - start;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const requestId = (req as any).requestId ?? null;

		logger.info({
			msg: 'http_request',
			requestId,
			method: req.method,
			path: req.originalUrl,
			status: res.statusCode,
			durationMs,
		});
	});

	next();
}
