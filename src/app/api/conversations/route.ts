import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Conversation } from "@/lib/models";

export const runtime = "nodejs";

/**
 * GET /api/conversations
 * Fetches all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get conversations sorted by most recent first
    const conversations = await Conversation.find({})
      .sort({ updatedAt: -1 })
      .limit(50) // Limit to 50 most recent conversations
      .select('title createdAt updatedAt _id')
      .lean();

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Deletes a specific conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Delete conversation and all its messages
    await Conversation.findByIdAndDelete(conversationId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
