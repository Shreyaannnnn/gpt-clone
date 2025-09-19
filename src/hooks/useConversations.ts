"use client";

import { useState, useRef, useCallback } from "react";
import { Conversation } from "@/types/chat";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      console.log('Fetching conversations...');
      
      const response = await fetch(`/api/conversations?t=${Date.now()}`);
      console.log('Conversations response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Conversations data received:', data);
        setConversations(data.conversations || []);
        console.log('Conversations updated in state:', data.conversations?.length || 0);
      } else {
        console.error('Failed to fetch conversations, status:', response.status);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const debouncedFetchConversations = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchConversations();
    }, 300);
  }, [fetchConversations]);

  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    conversations,
    setConversations,
    loadingConversations,
    searchQuery,
    setSearchQuery,
    filteredConversations,
    fetchConversations,
    debouncedFetchConversations,
  };
}
