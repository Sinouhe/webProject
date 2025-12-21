import { IsString, Length } from 'class-validator';

export class ChatDto {
	@IsString()
	@Length(3, 500)
	question!: string;
}
