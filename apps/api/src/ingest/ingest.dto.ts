import { IsArray, IsBoolean, IsOptional, IsUrl, ArrayMaxSize } from 'class-validator';

export class IngestDto {
	@IsArray()
	@ArrayMaxSize(50)
	@IsUrl({ require_tld: true }, { each: true })
	urls!: string[];

	@IsOptional()
	@IsBoolean()
	dryRun?: boolean;
}
