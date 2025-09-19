import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Message } from "@/lib/models";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * GET /api/conversations/[id]/messages
 * Fetches all messages for a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Fetch messages for the conversation that belong to the current user
    const messages = await Message.find({ conversationId, userId })
      .sort({ createdAt: 1 }) // Sort by creation time (oldest first)
      .lean();

    // Transform messages to match frontend format
    const transformedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      ...(msg.attachments && { data: { attachments: msg.attachments } }),
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt
    }));

    console.log('Fetched messages for conversation', conversationId, 'for user', userId, ':', messages.length);
    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation messages" },
      { status: 500 }
    );
  }
}
