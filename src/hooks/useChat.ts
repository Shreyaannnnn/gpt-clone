"use client";

import { useState, useRef, useCallback } from "react";
import { UIMsg, Attachment } from "@/types/chat";

export function useChat(fetchConversations?: () => void) {
  const [messages, setMessages] = useState<UIMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localInput, setLocalInput] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startNewChat = useCallback(() => {
    // Reset all conversation state
    setMessages([]);
    setLocalInput("");
    setConversationId(null);
    setEditingId(null);
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const handleEdit = useCallback((m: UIMsg) => {
    if (editingId === m.id) {
      // Cancel editing
      setEditingId(null);
      setLocalInput("");
    } else {
      // Start editing
      setLocalInput(m.content);
      setEditingId(m.id);
    }
  }, [editingId]);

  const confirmEditAndRegenerate = useCallback(async () => {
    if (!editingId) return;
    // Replace the targeted user message and drop any following assistant message to regenerate
    const idx = messages.findIndex(m => m.id === editingId);
    if (idx === -1) return;
    const updated = messages.slice(0, idx + 1).map((m, i) => (i === idx ? { ...m, content: localInput } : m));
    setMessages(updated);
    setEditingId(null);
    setLocalInput("");
    
    const controller = new AbortController();
    abortRef.current = controller;
    await streamAssistant(updated, controller);
  }, [editingId, messages, localInput]);

  const regenerateLast = useCallback(async () => {
    setError(null);
    const lastUserIndex = messages.map(m => m.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;
    const updated = messages.slice(0, lastUserIndex + 1);
    setMessages(updated);
    
    const controller = new AbortController();
    abortRef.current = controller;
    await streamAssistant(updated, controller);
  }, [messages]);

  const streamAssistant = useCallback(async (history: UIMsg[], controller: AbortController) => {
    console.log('streamAssistant called with history:', history.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...' })));
    
    setIsLoading(true);
    setError(null);
    
    const payload = {
      conversationId,
      messages: history.map(m => ({
        role: m.role,
        content: m.content, 
        ...(m.data?.attachments && { attachments: m.data.attachments })
      })),
    };
    
    console.log('Sending payload to /api/chat:', {
      conversationId: payload.conversationId,
      messagesCount: payload.messages.length,
      messages: payload.messages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...' }))
    });
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    const newConvoId = res.headers.get("x-conversation-id");
    console.log('New conversation ID from header:', newConvoId);
    if (newConvoId) {
      console.log('Setting conversation ID...');
      setConversationId(newConvoId);
    }
    
    if (!res.ok || !res.body) throw new Error("Failed to stream response");
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
        }
        return [...prev, { id: crypto.randomUUID(), role: "assistant", content: chunk }];
      });
    }
    setIsLoading(false);
    console.log('Streaming complete, refreshing conversations...');
    
    // Refresh conversations list after streaming is complete
    if (fetchConversations) {
      fetchConversations();
    }
  }, [conversationId]);

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    error,
    setError,
    conversationId,
    setConversationId,
    localInput,
    setLocalInput,
    editingId,
    setEditingId,
    abortRef,
    startNewChat,
    handleEdit,
    confirmEditAndRegenerate,
    regenerateLast,
    streamAssistant,
  };
}
