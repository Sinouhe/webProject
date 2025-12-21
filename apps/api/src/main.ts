import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

function generateRequestId(): string {
	return crypto.randomUUID();
}

async function bootstrap() {
	const env = loadEnv();
	const app = await NestFactory.create(AppModule, { bufferLogs: true });

	app.enableCors({
		origin: env.CORS_ORIGIN,
		credentials: false,
	});

	app.use((req: Request, res: Response, next: NextFunction) => {
		const incoming = req.header('x-request-id');
		const requestId = incoming?.toString() || generateRequestId();

		// Don't mutate req.headers (typing + semantics)
		res.setHeader('x-request-id', requestId);

		next();
	});

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		})
	);

	await app.listen(Number(env.PORT));

	console.log(`[api] Listening on http://localhost:${env.PORT}`);
}

bootstrap();
