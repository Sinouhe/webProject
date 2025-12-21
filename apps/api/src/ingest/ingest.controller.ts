import {
	Body,
	Controller,
	Headers,
	HttpException,
	HttpStatus,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestDto } from './ingest.dto';

@Controller('ingest')
export class IngestController {
	constructor(private readonly ingest: IngestService) {}

	@Post()
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
	async ingestUrls(
		@Headers('x-ingest-token') token: string | undefined,
		@Body() body: IngestDto
	) {
		if (!token || token !== process.env.INGEST_TOKEN) {
			throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
		}

		const dryRun = body.dryRun !== false; // default true

		return this.ingest.ingest({
			urls: body.urls,
			dryRun,
		});
	}
}
