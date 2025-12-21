import { IsString, MinLength } from 'class-validator';

export class ChatRequestDto {
	@IsString()
	@MinLength(2)
	question!: string;
}
