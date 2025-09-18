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
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    
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

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation messages" },
      { status: 500 }
    );
  }
}
