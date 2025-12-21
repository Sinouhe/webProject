import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { httpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
	const env = loadEnv();
	const app = await NestFactory.create(AppModule);

	app.use(requestIdMiddleware);
	app.use(httpLoggerMiddleware);
	app.useGlobalFilters(new GlobalExceptionFilter());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		})
	);

	const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:4321')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	app.enableCors({
		origin: (origin: string, cb: any) => {
			// Allow same-origin / server-to-server (no Origin header)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			if (!origin) return cb(null, true);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			if (allowedOrigins.includes(origin)) return cb(null, true);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			return cb(new Error('CORS blocked'), false);
		},
		credentials: false,
	});

	// Reasonable timeouts for demo/prod-ish API.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const httpServer = app.getHttpServer();

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	httpServer.headersTimeout = 65_000;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	httpServer.requestTimeout = 60_000;

	await app.listen(Number(env.PORT));
	console.log(`[api] Listening on http://localhost:${env.PORT}`);
}

bootstrap().catch((err) => {
	console.error('[api] Failed to start', err);
	process.exit(1);
});
