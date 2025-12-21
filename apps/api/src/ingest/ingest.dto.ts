import {
	ArrayMaxSize,
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
} from 'class-validator';

export class IngestDto {
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(50)
	@ArrayUnique()
	@IsString({ each: true })
	@IsUrl({ require_tld: true }, { each: true })
	@MaxLength(2048, { each: true })
	urls!: string[];

	@IsOptional()
	@IsBoolean()
	dryRun?: boolean;
}
