import { Message, Conversation } from "@/lib/models";

export type MemoryContext = { text: string } | null;

export async function recallMemory(conversationId: string): Promise<MemoryContext> {
	const convo = await Conversation.findById(conversationId).lean().exec();
	if (convo?.summary) return { text: convo.summary };
	// Build a tiny summary from recent user messages as a fallback
	const lastUser = await Message.find({ conversationId, role: "user" })
		.sort({ createdAt: -1 })
		.limit(3)
		.lean()
		.exec();
	if (!lastUser.length) return null;
	const text = lastUser
		.map((m) => m.content)
		.join("\n")
		.slice(0, 500);
	return { text };
}

export async function storeMemory(conversationId: string, content: string) {
	// Simple heuristic: update conversation summary to the latest assistant response
	await Conversation.findByIdAndUpdate(conversationId, { summary: content.slice(0, 800) }).exec();
}


