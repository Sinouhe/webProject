import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
	OPENAI_API_KEY: z.string().min(1),
	OPENAI_EMBEDDING_MODEL: z.string().min(1).optional(),
	OPENAI_CHAT_MODEL: z.string().min(1).optional(),

	PINECONE_API_KEY: z.string().min(1),
	PINECONE_INDEX: z.string().min(1),
	PINECONE_NAMESPACE: z.string().min(1),

	RAG_TOP_K: z.coerce.number().int().min(1).max(50).default(6),

	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	CORS_ORIGIN: z.string().min(1).default('http://localhost:4321'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
	const parsed = EnvSchema.safeParse(process.env);

	if (!parsed.success) {
		console.error(parsed.error.flatten().fieldErrors);
		throw new Error('Invalid environment variables');
	}

	return parsed.data;
}
