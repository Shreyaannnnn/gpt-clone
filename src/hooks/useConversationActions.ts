"use client";

import { useState, useCallback } from "react";
import { Conversation } from "@/types/chat";

export function useConversationActions(
  conversations: Conversation[],
  setConversations: (conversations: Conversation[]) => void,
  conversationId: string | null,
  startNewChat: () => void,
  fetchConversations?: () => void
) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ conversationId: string; x: number; y: number } | null>(null);

  const handleDropdownClick = useCallback((event: React.MouseEvent, conversationId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setShowDropdown(showDropdown === conversationId ? null : conversationId);
  }, [showDropdown]);

  const closeDropdown = useCallback(() => {
    setShowDropdown(null);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleShare = useCallback((conversationId: string) => {
    // For now, just copy the conversation ID to clipboard
    navigator.clipboard.writeText(conversationId);
    setShowDropdown(null);
    // You could show a toast notification here
  }, []);

  const handleRename = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation) {
      setRenameValue(conversation.title);
      setRenamingId(conversationId);
    }
    setShowDropdown(null);
  }, [conversations]);

  const saveRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) return;
    try {
      const response = await fetch(`/api/conversations/${renamingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      
      if (response.ok) {
        // Update the conversation in the list
        setConversations(prev => prev.map(c => 
          c._id === renamingId ? { ...c, title: renameValue.trim() } : c
        ));
        setRenamingId(null);
        setRenameValue("");
        
        // Refresh conversations list
        if (fetchConversations) {
          fetchConversations();
        }
      } else {
        console.error('Failed to rename conversation');
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  }, [renamingId, renameValue]);

  const deleteConversation = useCallback(async (conversationIdToDelete: string) => {
    try {
      const response = await fetch(`/api/conversations?id=${conversationIdToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from conversations list
        setConversations(prev => prev.filter(c => c._id !== conversationIdToDelete));
        setShowDropdown(null);
        
        // If this was the current conversation, start a new chat
        if (conversationId === conversationIdToDelete) {
          startNewChat();
        }
        
        // Refresh conversations list
        if (fetchConversations) {
          fetchConversations();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }, [conversationId, startNewChat]);

  return {
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    showDropdown,
    setShowDropdown,
    contextMenu,
    setContextMenu,
    handleDropdownClick,
    closeDropdown,
    closeContextMenu,
    handleShare,
    handleRename,
    saveRename,
    deleteConversation,
  };
}
