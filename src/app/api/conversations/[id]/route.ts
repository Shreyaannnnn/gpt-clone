import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Conversation } from "@/lib/models";

export const runtime = "nodejs";

/**
 * PATCH /api/conversations/[id]
 * Updates a specific conversation (e.g., rename)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
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
    
    // Update the conversation title
    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
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
