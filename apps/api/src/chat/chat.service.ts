import { Injectable } from '@nestjs/common';
import { runChatStrict } from '@ragcv/rag';
import { loadEnv } from '../config/env';

@Injectable()
export class ChatService {
	private readonly env = loadEnv();

	private buildConfig() {
		return {
			openAiApiKey: this.env.OPENAI_API_KEY,
			pineconeApiKey: this.env.PINECONE_API_KEY,
			pineconeIndex: this.env.PINECONE_INDEX,
			pineconeNamespace: this.env.PINECONE_NAMESPACE,
			embeddingModel: this.env.OPENAI_EMBEDDING_MODEL,
			chatModel: this.env.OPENAI_CHAT_MODEL,
			topK: Number(this.env.RAG_TOP_K),
		};
	}

	chat(question: string) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return runChatStrict({
			config: this.buildConfig(),
			question,
			isStream: false,
		});
	}

	chatStream(question: string, onToken: (token: string) => void) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return runChatStrict({
			config: this.buildConfig(),
			question,
			isStream: true,
			onToken,
		});
	}
}
