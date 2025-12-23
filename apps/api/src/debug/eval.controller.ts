import { Controller, Get } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Controller('debug')
export class EvalDebugController {
	@Get('eval')
	async evalScore() {
		const path = join(process.cwd(), 'packages/eval/eval-report.json');
		const raw = await readFile(path, 'utf-8');
		return JSON.parse(raw);
	}
}
