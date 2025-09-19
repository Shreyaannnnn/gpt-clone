import { Message, Conversation } from "@/lib/models";

export interface MemoryEntry {
  id: string;
  content: string;
  metadata: {
    conversationId: string;
    userId: string;
    timestamp: Date;
    type: 'user_preference' | 'fact' | 'context' | 'summary';
    importance: number; // 1-10 scale
  };
  embeddings?: number[];
}

export interface MemorySearchResult {
  content: string;
  score: number;
  metadata: MemoryEntry['metadata'];
}

export class Mem0Client {
  private userId: string;
  private conversationId: string;

  constructor(userId: string, conversationId: string) {
    this.userId = userId;
    this.conversationId = conversationId;
  }

  /**
   * Add a memory entry
   */
  async addMemory(
    content: string, 
    type: MemoryEntry['metadata']['type'] = 'context',
    importance: number = 5
  ): Promise<string> {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in conversation summary for now (can be enhanced with vector DB later)
    const memoryEntry = {
      id: memoryId,
      content,
      metadata: {
        conversationId: this.conversationId,
        userId: this.userId,
        timestamp: new Date(),
        type,
        importance
      }
    };

    // Update conversation with enhanced memory
    await this.updateConversationMemory(memoryEntry);
    
    return memoryId;
  }

  /**
   * Search for relevant memories
   */
  async searchMemories(
    query: string, 
    limit: number = 5,
    minScore: number = 0.3
  ): Promise<MemorySearchResult[]> {
    // Get conversation summary and recent messages
    const conversation = await (Conversation as any).findById(this.conversationId).lean().exec();
    const recentMessages = await (Message as any).find({ 
      conversationId: this.conversationId,
      userId: this.userId 
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    const memories: MemorySearchResult[] = [];

    // Add conversation summary if it exists
    if (conversation?.summary) {
      const score = this.calculateSimilarity(query, conversation.summary);
      if (score >= minScore) {
        memories.push({
          content: conversation.summary,
          score,
          metadata: {
            conversationId: this.conversationId,
            userId: this.userId,
            timestamp: conversation.updatedAt,
            type: 'summary',
            importance: 8
          }
        });
      }
    }

    // Add relevant recent messages
    for (const message of recentMessages) {
      const score = this.calculateSimilarity(query, message.content);
      if (score >= minScore) {
        memories.push({
          content: message.content,
          score,
          metadata: {
            conversationId: this.conversationId,
            userId: this.userId,
            timestamp: message.createdAt,
            type: message.role === 'user' ? 'user_preference' : 'context',
            importance: message.role === 'user' ? 7 : 5
          }
        });
      }
    }

    // Sort by score and importance, return top results
    return memories
      .sort((a, b) => (b.score * b.metadata.importance) - (a.score * a.metadata.importance))
      .slice(0, limit);
  }

  /**
   * Get all memories for the conversation
   */
  async getAllMemories(): Promise<MemorySearchResult[]> {
    return this.searchMemories("", 50, 0);
  }

  /**
   * Delete a specific memory entry
   */
  async deleteMemory(memoryId: string): Promise<void> {
    const conversation = await (Conversation as any).findById(this.conversationId).lean().exec();
    
    if (conversation && conversation.memoryEntries) {
      // Filter out the memory entry with the specified ID
      const updatedMemoryEntries = conversation.memoryEntries.filter(
        (entry: any) => entry.id !== memoryId
      );
      
      // Update the conversation with the filtered memory entries
      await (Conversation as any).findByIdAndUpdate(
        this.conversationId,
        { memoryEntries: updatedMemoryEntries }
      ).exec();
    }
  }

  /**
   * Update conversation with memory information
   */
  private async updateConversationMemory(memory: MemoryEntry): Promise<void> {
    const conversation = await (Conversation as any).findById(this.conversationId).lean().exec();
    
    if (conversation) {
      // Create enhanced summary with memory
      const existingSummary = conversation.summary || '';
      const newSummary = this.createEnhancedSummary(existingSummary, memory);
      
      await (Conversation as any).findByIdAndUpdate(
        this.conversationId, 
        { 
          summary: newSummary,
          memoryEntries: [...(conversation.memoryEntries || []), memory]
        }
      ).exec();
    }
  }

  /**
   * Create enhanced summary with memory
   */
  private createEnhancedSummary(existingSummary: string, memory: MemoryEntry): string {
    const maxLength = 1000;
    
    if (memory.metadata.type === 'summary') {
      return memory.content.slice(0, maxLength);
    }
    
    if (memory.metadata.importance >= 7) {
      const newContent = `${existingSummary}\n\nImportant: ${memory.content}`;
      return newContent.slice(0, maxLength);
    }
    
    return existingSummary;
  }

  /**
   * Simple similarity calculation (can be enhanced with proper embeddings)
   */
  private calculateSimilarity(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const commonWords = queryWords.filter(word => contentWords.includes(word));
    const similarity = commonWords.length / Math.max(queryWords.length, 1);
    
    return Math.min(similarity, 1);
  }

  /**
   * Extract key information from conversation
   */
  async extractKeyInfo(messages: any[]): Promise<void> {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Extract user preferences
    for (const message of userMessages) {
      if (this.containsPreference(message.content)) {
        await this.addMemory(
          `User preference: ${message.content}`,
          'user_preference',
          8
        );
      }
    }
    
    // Extract important facts from assistant responses
    for (const message of assistantMessages) {
      if (this.containsFact(message.content)) {
        await this.addMemory(
          `Fact: ${message.content}`,
          'fact',
          6
        );
      }
    }
  }

  /**
   * Check if message contains user preferences
   */
  private containsPreference(content: string): boolean {
    const preferenceKeywords = [
      'i like', 'i prefer', 'i want', 'i need', 'i love', 'i hate',
      'my favorite', 'i always', 'i never', 'i usually', 'i typically'
    ];
    
    const lowerContent = content.toLowerCase();
    return preferenceKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Check if message contains important facts
   */
  private containsFact(content: string): boolean {
    const factKeywords = [
      'remember', 'note that', 'important', 'keep in mind',
      'fact:', 'info:', 'data:', 'statistics'
    ];
    
    const lowerContent = content.toLowerCase();
    return factKeywords.some(keyword => lowerContent.includes(keyword));
  }
}

/**
 * Create a new Mem0 client instance
 */
export function createMem0Client(userId: string, conversationId: string): Mem0Client {
  return new Mem0Client(userId, conversationId);
}

/**
 * Legacy functions for backward compatibility
 */
export async function recallMemory(conversationId: string): Promise<{ text: string } | null> {
  const conversation = await (Conversation as any).findById(conversationId).lean().exec();
  if (conversation?.summary) return { text: conversation.summary };
  return null;
}

export async function storeMemory(conversationId: string, content: string): Promise<void> {
  await (Conversation as any).findByIdAndUpdate(
    conversationId, 
    { summary: content.slice(0, 800) }
  ).exec();
}
