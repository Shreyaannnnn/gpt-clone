import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Conversation } from "@/lib/models";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * GET /api/conversations
 * Fetches all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    // Get conversations for the current user only
    const conversations = await Conversation.find({ userId })
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
 * DELETE /api/conversations
 * Deletes a specific conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Delete conversation only if it belongs to the current user
    const result = await Conversation.deleteOne({ 
      _id: conversationId, 
      userId 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Conversation not found or unauthorized" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
