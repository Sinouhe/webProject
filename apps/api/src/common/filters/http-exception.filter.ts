import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorResponseBody = {
	requestId: string | null;
	error: {
		code: string;
		message: string;
	};
};

function normalizeMessage(input: unknown, fallback: string): string {
	if (typeof input === 'string') return input;
	if (Array.isArray(input) && input.every((x) => typeof x === 'string')) return input.join(' | ');
	return fallback;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request>();
		const res = ctx.getResponse<Response>();

		const requestId = req.requestId ?? null;

		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const response = exception.getResponse();

			const message =
				typeof response === 'string'
					? response
					: normalizeMessage(
							(response as { message?: unknown })?.message,
							exception.message || 'Request failed'
						);

			const body: ErrorResponseBody = {
				requestId,
				error: {
					code: `HTTP_${status}`,
					message,
				},
			};

			res.status(status).json(body);
			return;
		}

		const body: ErrorResponseBody = {
			requestId,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Unexpected error',
			},
		};

		res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
	}
}
