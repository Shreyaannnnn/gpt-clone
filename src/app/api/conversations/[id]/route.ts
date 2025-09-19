import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Conversation } from "@/lib/models";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * PATCH /api/conversations/[id]
 * Updates a specific conversation (e.g., rename)
 */
export async function PATCH(
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
    const { title } = await request.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Valid title is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Update the conversation title (only if user owns it)
    const updatedConversation = await (Conversation as any).findOneAndUpdate(
      { _id: conversationId, userId },
      { title: title.trim() },
      { new: true }
    );

    if (!updatedConversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      conversation: {
        _id: updatedConversation._id,
        title: updatedConversation.title,
        updatedAt: updatedConversation.updatedAt
      }
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
