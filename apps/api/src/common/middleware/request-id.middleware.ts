import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Adds a requestId to every request.
 * - Uses incoming x-request-id if provided.
 * - Otherwise generates a UUID.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
	const incoming = req.header('x-request-id');
	const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	(req as any).requestId = requestId;
	res.setHeader('x-request-id', requestId);
	next();
}
