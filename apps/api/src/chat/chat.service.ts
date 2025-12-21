import { Injectable } from '@nestjs/common';
import {
	createRetriever,
	retrieveContext,
	answerQuestionStrict,
	streamAnswerStrict,
} from '@ragcv/rag';

import { loadEnv } from '../config/env';

@Injectable()
export class ChatService {
	private readonly env = loadEnv();

	async chat(question: string) {
		const cfg = {
			openAiApiKey: this.env.OPENAI_API_KEY,
			pineconeApiKey: this.env.PINECONE_API_KEY,
			pineconeIndex: this.env.PINECONE_INDEX,
			pineconeNamespace: this.env.PINECONE_NAMESPACE,
			embeddingModel: this.env.OPENAI_EMBEDDING_MODEL,
			chatModel: this.env.OPENAI_CHAT_MODEL,
			topK: Number(this.env.RAG_TOP_K),
		};

		const retriever = await createRetriever(cfg);
		const retrieval = await retrieveContext(retriever, question);

		const result = await answerQuestionStrict({
			config: cfg,
			question,
			contextText: retrieval.contextText,
			sources: retrieval.sources,
		});

		return result;
	}

	async chatStream(question: string, onToken: (token: string) => void) {
		const cfg = {
			openAiApiKey: this.env.OPENAI_API_KEY,
			pineconeApiKey: this.env.PINECONE_API_KEY,
			pineconeIndex: this.env.PINECONE_INDEX,
			pineconeNamespace: this.env.PINECONE_NAMESPACE,
			embeddingModel: this.env.OPENAI_EMBEDDING_MODEL,
			chatModel: this.env.OPENAI_CHAT_MODEL,
			topK: Number(this.env.RAG_TOP_K),
		};

		console.log({ cfg });

		const retriever = await createRetriever(cfg);
		const retrieval = await retrieveContext(retriever, question);

		const { citations } = await streamAnswerStrict({
			config: cfg,
			question,
			contextText: retrieval.contextText,
			sources: retrieval.sources,
			onToken,
		});

		return { citations };
	}
}
