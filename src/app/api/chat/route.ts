import { NextRequest } from "next/server";
import { streamText, createTextStreamResponse } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { createMem0Client } from "@/lib/mem0";
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
			const convo = new Conversation({ title, userId });
			await convo.save();
			convoId = convo._id.toString();
			console.log('Created conversation with ID:', convoId);
		}

		// If client sent per-request attachments, merge into the last user message
		const merged: ChatMessage[] = Array.isArray(messages) ? [...messages] : [];
		console.log('Merged messages:', merged.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...' })));
		
		if (data?.attachments && merged.length) {
			const lastIdx = merged.length - 1;
			if (merged[lastIdx] && merged[lastIdx].role === "user") {
				merged[lastIdx] = { ...merged[lastIdx], attachments: data.attachments };
			}
		}

		// Enhanced memory system with mem0
		let withMemory: ChatMessage[] = merged;
		if (convoId) {
			const mem0 = createMem0Client(userId, convoId);
			
			// Extract key information from current conversation
			await mem0.extractKeyInfo(merged);
			
			// Search for relevant memories
			const relevantMemories = await mem0.searchMemories(
				merged.map(m => m.content).join(' '), 
				3, 
				0.3
			);
			
			if (relevantMemories.length > 0) {
				const memoryContext = relevantMemories
					.map(m => `[${m.metadata.type.toUpperCase()}] ${m.content}`)
					.join('\n\n');
				
				withMemory = [
					{ 
						role: "system", 
						content: `Relevant memories from past conversations:\n\n${memoryContext}\n\nUse this information to provide more personalized and contextually aware responses.` 
					}, 
					...merged
				];
			}
		}

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
				const userMessage = new Message({ 
					conversationId: convoId, 
					role: "user", 
					content: last.content, 
					attachments: last.attachments, 
					userId 
				});
				await userMessage.save();
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
                const assistantMessage = new Message({ 
                    conversationId: convoId, 
                    role: "assistant", 
                    content: finalText, 
                    userId 
                });
                await assistantMessage.save();
                console.log('Assistant message saved successfully with ID:', assistantMessage._id);
                
                // Enhanced memory storage with mem0
                if (convoId) {
                    const mem0 = createMem0Client(userId, convoId);
                    await mem0.addMemory(
                        `Assistant response: ${finalText}`,
                        'context',
                        6
                    );
                }
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


