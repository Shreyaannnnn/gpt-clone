import { NextRequest } from "next/server";
import { streamText, createTextStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { recallMemory, storeMemory } from "@/lib/memory";
import { auth } from "@clerk/nextjs/server";

type ChatMessage = {
	role: "user" | "assistant" | "system";
	content: string;
	attachments?: Array<{ url: string; type: string; name?: string; size?: number }>;
};

export const runtime = "nodejs";

function trimHistory(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
	// Simple heuristic: limit number of messages; sophisticated tokenization can be added later
	const maxMessages = Math.max(6, Math.floor(maxTokens / 500));
	return messages.slice(-maxMessages);
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		
		if (!userId) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const body = await req.json();
		const { conversationId, messages, system, model = "gpt-4o-mini", maxTokens = 8000, data } = body as {
			conversationId?: string;
			messages: ChatMessage[];
			system?: string;
			model?: string;
			maxTokens?: number;
			data?: { attachments?: ChatMessage["attachments"] };
		};

		console.log('Chat API called with:', {
			conversationId,
			messagesCount: messages?.length,
			userId,
			hasData: !!data
		});

		await connectToDatabase();

		let convoId = conversationId;
		if (!convoId) {
			const title = messages?.[0]?.content?.slice(0, 40) || "New chat";
			console.log('Creating new conversation with title:', title, 'for user:', userId);
			const convo = await Conversation.create({ title, userId });
			convoId = convo._id.toString();
			console.log('Created conversation with ID:', convoId);
		}

		// If client sent per-request attachments, merge into the last user message
		const merged: ChatMessage[] = Array.isArray(messages) ? [...messages] : [];
		console.log('Merged messages:', merged.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...' })));
		
		if (data?.attachments && merged.length) {
			const lastIdx = merged.length - 1;
			if (merged[lastIdx].role === "user") {
				merged[lastIdx] = { ...merged[lastIdx], attachments: data.attachments };
			}
		}

		const memory = convoId ? await recallMemory(convoId) : null;
		const withMemory: ChatMessage[] = memory
			? [{ role: "system", content: `Relevant memory: ${memory.text}` }, ...merged]
			: merged;

    const pruned = trimHistory(withMemory, maxTokens);
    const coreMessages = pruned.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content ?? "" }));

        const result = await streamText({
            model: openai(model),
            system: system || "You are a helpful assistant.",
            messages: coreMessages,
        });

		// Persist the last user message immediately
		const last = merged[merged.length - 1];
		console.log('Last message to save:', last ? { role: last.role, content: last.content?.substring(0, 50) + '...' } : 'No last message');
		
		if (last && last.role === "user") {
			try {
				console.log('Saving user message for conversation', convoId);
				const userMessage = await Message.create({ 
					conversationId: convoId, 
					role: "user", 
					content: last.content, 
					attachments: last.attachments, 
					userId 
				});
				console.log('User message saved successfully with ID:', userMessage._id);
			} catch (error) {
				console.error('Error saving user message:', error);
			}
		} else {
			console.log('No user message to save - last message role:', last?.role);
		}

        // Convert to a text stream (compatible helper in this version)
        const textStream = await (async () => {
            const reader = (await result.textStream).getReader?.() ?? (result as any).toTextStream?.().getReader?.();
            if (reader) {
                // Already a readable stream
                return (await result.textStream) as unknown as ReadableStream<string>;
            }
            // Fallback: synthesize from async iterator
            const encoder = new TextEncoder();
            const stream = new ReadableStream<string>({
                start: async (controller) => {
                    try {
                        for await (const chunk of (result as any).textStream) {
                            controller.enqueue(String(chunk));
                        }
                        controller.close();
                    } catch (e) {
                        controller.error(e);
                    }
                },
            });
            return stream;
        })();

        // Persist assistant final once consumed
        result.text.then(async (finalText) => {
            try {
                console.log('Saving assistant message for conversation', convoId);
                const assistantMessage = await Message.create({ 
                    conversationId: convoId, 
                    role: "assistant", 
                    content: finalText, 
                    userId 
                });
                console.log('Assistant message saved successfully with ID:', assistantMessage._id);
                await storeMemory(convoId!, finalText);
            } catch (error) {
                console.error('Error saving assistant message:', error);
            }
        }).catch((error) => {
            console.error('Error in assistant message promise:', error);
        });

        return createTextStreamResponse({
            headers: { "x-conversation-id": convoId as string },
            textStream,
        });
	} catch (err) {
		return new Response(JSON.stringify({ error: "Chat error", details: String(err) }), { status: 500 });
	}
}


