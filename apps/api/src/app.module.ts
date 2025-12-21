import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ChatModule } from './chat/chat.module';
import { IngestModule } from './ingest/ingest.module';
import { HealthModule } from './health/health.module';
import { DebugModule } from './debug/debug.module';

@Module({
	imports: [
		ThrottlerModule.forRoot([
			{
				ttl: 60_000,
				limit: 50,
			},
		]),
		ChatModule,
		IngestModule,
		DebugModule,
		HealthModule,
	],
})
export class AppModule {}
