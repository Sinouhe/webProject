import { Body, Controller, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatDto } from './chat.dto';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Post('chat')
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
	async chat(@Body() body: ChatDto) {
		return this.chatService.chat(body.question);
	}

	@Post('/chat/stream')
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
	async chatStream(@Body() body: ChatDto, @Res() res: Response) {
		res.status(200);
		res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
		res.setHeader('Cache-Control', 'no-cache, no-transform');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders?.();

		try {
			const result = await this.chatService.chatStream(body.question, (chunk) => {
				res.write(`event: token\n`);
				res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
			});

			res.write(`event: citations\n`);
			res.write(`data: ${JSON.stringify({ citations: result.citations })}\n\n`);

			res.write(`event: done\n`);
			res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
			res.end();
		} catch (err: any) {
			res.write(`event: error\n`);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			res.write(`data: ${JSON.stringify({ message: err?.message ?? 'Unknown error' })}\n\n`);
			res.end();
		}
	}
}
