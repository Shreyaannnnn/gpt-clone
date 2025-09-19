/**
 * Type definitions for the chat interface
 */

export type Attachment = { 
  url: string; 
  type: string; 
  name?: string; 
  size?: number; 
};

export type UIMsg = { 
  id: string; 
  role: "user" | "assistant" | "system"; 
  content: string; 
  data?: { attachments?: Attachment[] } 
};

export type Conversation = { 
  _id: string; 
  title: string; 
  createdAt: string; 
  updatedAt: string; 
};

export type ContextMenu = {
  conversationId: string;
  x: number;
  y: number;
} | null;

export type DropdownState = {
  conversationId: string;
  x: number;
  y: number;
} | null;
