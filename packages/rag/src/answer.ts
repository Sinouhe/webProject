import { ChatOpenAI } from '@langchain/openai';

export type StreamStrictParams = {
	config: {
		openAiApiKey: string;
		chatModel?: string;
	};
	question: string;
	contextText: string;
	sources: string[];
	onToken: (token: string) => void;
};

export async function streamAnswerStrict(
	params: StreamStrictParams
): Promise<{ citations: string[] }> {
	const { config, question, contextText, sources, onToken } = params;

	const llm = new ChatOpenAI({
		apiKey: config.openAiApiKey,
		model: config.chatModel ?? 'gpt-4o-mini',
		temperature: 0,
		streaming: true,
	});

	const prompt = [
		'You are a strict RAG assistant.',
		'Rules:',
		'- Use ONLY the provided CONTEXT to answer.',
		"- If the answer is not explicitly supported by CONTEXT, respond exactly: I don't know.",
		'- Do NOT invent facts.',
		'',
		'CONTEXT:',
		contextText,
		'',
		`QUESTION: ${question}`,
	].join('\n');

	// Stream tokens
	const stream = await llm.stream(prompt);
	for await (const chunk of stream) {
		const token = typeof chunk.content === 'string' ? chunk.content : '';
		if (token) onToken(token);
	}

	// Citations are decided from retrieval sources (strict)
	// We keep it simple: we return all retrieved sources (deduped).
	return { citations: sources };
}

export type AnswerStrictParams = {
	config: {
		openAiApiKey: string;
		chatModel?: string;
	};
	question: string;
	contextText: string;
	sources: string[];
};

export type AnswerStrictResult = {
	answer: string;
	citations: string[];
};

/**
 * Strict grounded answering:
 * - Only use the provided context
 * - If insufficient, answer exactly: "I don't know."
 * - Always include citations (source strings).
 */
export async function answerQuestionStrict(
	params: AnswerStrictParams
): Promise<AnswerStrictResult> {
	const { config, question, contextText, sources } = params;

	const llm = new ChatOpenAI({
		apiKey: config.openAiApiKey,
		model: config.chatModel ?? 'gpt-4o-mini',
		temperature: 0,
	});

	const prompt = [
		'You are a strict RAG assistant.',
		'Rules:',
		'- Use ONLY the provided CONTEXT to answer.',
		"- If the answer is not explicitly supported by CONTEXT, respond exactly: I don't know.",
		'- Provide citations as a JSON array of source strings (URLs).',
		'',
		'CONTEXT:',
		contextText,
		'',
		`QUESTION: ${question}`,
		'',
		'Return a JSON object with keys: answer, citations.',
		'citations must be a subset of the provided sources list.',
		'',
		'SOURCES LIST:',
		JSON.stringify(sources),
	].join('\n');

	const res = await llm.invoke(prompt);
	const text = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);

	// Minimal robust parse: accept JSON or fallback
	try {
		const parsed = JSON.parse(text) as { answer?: string; citations?: string[] };
		const answer = (parsed.answer ?? '').trim();
		const citations = Array.isArray(parsed.citations) ? parsed.citations : [];
		if (!answer) return { answer: "I don't know.", citations: [] };
		return { answer, citations };
	} catch {
		// If model didn't follow format, fallback strictly
		return {
			answer: "I don't know.",
			citations: [],
		};
	}
}
