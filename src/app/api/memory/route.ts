import { NextRequest, NextResponse } from "next/server";
import { createMem0Client } from "@/lib/mem0";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * GET /api/memory?conversationId=xxx&query=xxx
 * Search for memories in a conversation
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const minScore = parseFloat(searchParams.get('minScore') || '0.3');

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const mem0 = createMem0Client(userId, conversationId);
    const memories = await mem0.searchMemories(query, limit, minScore);

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Error searching memories:", error);
    return NextResponse.json(
      { error: "Failed to search memories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory
 * Add a new memory entry
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, content, type = 'context', importance = 5 } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "Conversation ID and content are required" },
        { status: 400 }
      );
    }

    const mem0 = createMem0Client(userId, conversationId);
    const memoryId = await mem0.addMemory(content, type, importance);

    return NextResponse.json({ 
      success: true, 
      memoryId,
      message: "Memory added successfully" 
    });
  } catch (error) {
    console.error("Error adding memory:", error);
    return NextResponse.json(
      { error: "Failed to add memory" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory?conversationId=xxx&memoryId=xxx
 * Delete a specific memory entry
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
    const conversationId = searchParams.get('conversationId');
    const memoryId = searchParams.get('memoryId');

    if (!conversationId || !memoryId) {
      return NextResponse.json(
        { error: "Conversation ID and memory ID are required" },
        { status: 400 }
      );
    }

    // Remove the specific memory entry from the conversation
    const mem0 = createMem0Client(userId, conversationId);
    await mem0.deleteMemory(memoryId);

    return NextResponse.json({ 
      success: true,
      message: "Memory deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}
