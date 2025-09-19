"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Conversation, ContextMenu, DropdownState } from "@/types/chat";

interface SidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  conversations: Conversation[];
  loadingConversations: boolean;
  filteredConversations: Conversation[];
  conversationId: string | null;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  showDropdown: string | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  startNewChat: () => void;
  fetchConversations: () => void;
  loadConversation: (id: string) => void;
  handleDropdownClick: (e: React.MouseEvent, id: string) => void;
  handleShare: (id: string) => void;
  handleRename: (id: string) => void;
  saveRename: () => void;
  deleteConversation: (id: string) => void;
}

export default function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  conversations,
  loadingConversations,
  filteredConversations,
  conversationId,
  renamingId,
  renameValue,
  setRenameValue,
  showDropdown,
  mobileMenuOpen,
  setMobileMenuOpen,
  startNewChat,
  fetchConversations,
  loadConversation,
  handleDropdownClick,
  handleShare,
  handleRename,
  saveRename,
  deleteConversation,
}: SidebarProps) {
  const { user } = useUser();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        id="sidebar"
        className={`col-start-1 col-end-2 row-start-1 row-end-4 border-r border-white/10 bg-[#181818] hidden md:flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:w-12' : 'md:w-48'}`}
        aria-label="Navigation sidebar"
      >
        {/* Sidebar Header */}
        <div className="h-12 flex items-center justify-between px-2">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              {/* ChatGPT Logo */}
              <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-white">ChatGPT</span>
            </div>
          )}
          
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-[#414141] transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Close sidebar"}
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        {!sidebarCollapsed && (
          <div className="px-2 space-y-1">
            {/* New Chat */}
            <button 
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-[#414141] transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>

            {/* Search Chats */}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/70 hover:bg-[#414141] hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search chats
            </button>
          </div>
        )}

        {/* Search Input */}
        {!sidebarCollapsed && showSearch && (
          <div className="px-2 py-1">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[#212121] border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
              autoFocus
            />
          </div>
        )}

        {/* Collapsed State - Just Icons */}
        {sidebarCollapsed && (
          <div className="px-1 space-y-1">
            <button 
              onClick={startNewChat}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-white hover:bg-[#414141] transition-colors cursor-pointer"
              title="New chat"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}

        {/* Conversations Section - Hidden when collapsed */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-auto px-2 py-1" aria-label="Conversations" role="navigation">
            {/* Chats Heading */}
            <div className="px-2 pt-3 pb-1 flex items-center justify-between">
              <h3 className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Chats</h3>
              <div className="flex gap-1">
                <button 
                  onClick={fetchConversations}
                  className="text-[8px] text-white/40 hover:text-white/60 cursor-pointer"
                  title="Refresh conversations"
                >
                  ↻
                </button>
                <span className="text-[8px] text-white/30">
                  {conversations.length}
                </span>
              </div>
            </div>
            
            {/* Previous conversations */}
            {loadingConversations ? (
              <div className="text-xs text-white/50 px-2 py-1">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-xs text-white/50 px-2 py-1">No conversations yet</div>
            ) : (
            filteredConversations.map((conversation) => (
              <div key={conversation._id} className="group relative">
                {renamingId === conversation._id ? (
                  <div className="px-2 py-1.5">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveRename();
                        } else if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue("");
                        }
                      }}
                      onBlur={saveRename}
                      className="w-full bg-transparent text-white text-xs border-none outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => loadConversation(conversation._id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-[#414141] group-hover:bg-[#414141] transition-colors ${
                        conversationId === conversation._id 
                          ? 'bg-[#414141]' 
                          : ''
                      }`}
                    >
                      <div className="truncate text-white pr-6">
                        {conversation.title}
                      </div>
                    </button>
                    
                    {/* Three dots menu button - absolutely positioned */}
                    <button
                      onClick={(e) => handleDropdownClick(e, conversation._id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#414141] transition-all duration-200 cursor-pointer"
                      aria-label="More options"
                      data-dropdown-button
                    >
                      <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {/* Dropdown menu */}
                    {showDropdown === conversation._id && (
                      <div className="absolute right-0 top-0 mt-6 bg-[#2D2D2D] border border-white/10 rounded shadow-lg py-1 min-w-[140px] z-50" data-dropdown-menu>
                        <button
                          onClick={() => handleShare(conversation._id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-[#414141] transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                          </svg>
                          Share
                        </button>
                        
                        <button
                          onClick={() => handleRename(conversation._id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-[#414141] transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Rename
                        </button>
                        
                        <div className="border-t border-white/10 my-1"></div>
                        
                        <button
                          onClick={() => deleteConversation(conversation._id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-[#414141] transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        )}
        
        {/* User Profile Section - Hidden when collapsed */}
        {!sidebarCollapsed && (
          <div className="mt-auto p-2 border-t border-white/10">
            <div className="flex items-center gap-2 p-1.5 rounded hover:bg-[#414141] transition-colors">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-6 w-6",
                    userButtonPopoverCard: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg",
                    userButtonPopoverActionButton: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                    userButtonPopoverFooter: "hidden",
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {user?.fullName || user?.firstName || 'User Account'}
                </div>
                <div className="text-xs text-white/60">
                  Free Plan
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed User Profile - Just Avatar */}
        {sidebarCollapsed && (
          <div className="mt-auto p-1 border-t border-white/10">
            <div className="flex justify-center">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-6 w-6",
                    userButtonPopoverCard: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg",
                    userButtonPopoverActionButton: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                    userButtonPopoverFooter: "hidden",
                  }
                }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Mobile Sidebar */}
          <aside 
            className="fixed left-0 top-0 h-full w-64 bg-[#212121] border-r border-white/10 z-50 md:hidden transform transition-transform duration-300 flex flex-col"
            aria-label="Mobile navigation sidebar"
            role="navigation"
          >
            {/* Mobile Sidebar Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                {/* ChatGPT Logo */}
                <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="text-xs font-medium text-white">ChatGPT</span>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded hover:bg-[#414141] transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile Navigation Items */}
            <div className="px-2 py-2 space-y-1">
              {/* New Chat */}
              <button 
                onClick={() => {
                  startNewChat();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-[#414141] transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New chat
              </button>

              {/* Search Chats */}
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/70 hover:bg-[#414141] hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search chats
              </button>
            </div>

            {/* Mobile Search Input */}
            {showSearch && (
              <div className="px-2 py-1">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[#212121] border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  autoFocus
                />
              </div>
            )}

            {/* Mobile Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Mobile Conversations Section */}
              <div className="flex-1 overflow-auto px-2 py-1">
              {/* Chats Heading */}
              <div className="px-2 pt-3 pb-1">
                <h3 className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Chats</h3>
              </div>
              
              {/* Previous conversations */}
              {loadingConversations ? (
                <div className="text-xs text-white/50 px-2 py-1">Loading...</div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div key={conversation._id} className="group relative">
                    {renamingId === conversation._id ? (
                      <div className="px-2 py-1.5">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              saveRename();
                            } else if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameValue("");
                            }
                          }}
                          onBlur={saveRename}
                          className="w-full bg-transparent text-white text-xs border-none outline-none"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="relative group">
                        <button
                          onClick={() => {
                            loadConversation(conversation._id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-[#414141] group-hover:bg-[#414141] transition-colors ${
                            conversationId === conversation._id 
                              ? 'bg-[#414141]' 
                              : ''
                          }`}
                        >
                          <div className="truncate text-white pr-6">
                            {conversation.title}
                          </div>
                        </button>
                        
                        {/* Three dots menu button - absolutely positioned */}
                        <button
                          onClick={(e) => handleDropdownClick(e, conversation._id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#414141] transition-all duration-200 cursor-pointer"
                          aria-label="More options"
                          data-dropdown-button
                        >
                          <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        
                        {/* Dropdown menu */}
                        {showDropdown === conversation._id && (
                          <div className="absolute right-0 top-0 mt-6 bg-[#2D2D2D] border border-white/10 rounded shadow-lg py-1 min-w-[140px] z-50" data-dropdown-menu>
                            <button
                              onClick={() => handleShare(conversation._id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-[#414141] transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                              </svg>
                              Share
                            </button>
                            
                            <button
                              onClick={() => handleRename(conversation._id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-white hover:bg-[#414141] transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Rename
                            </button>
                            
                            <div className="border-t border-white/10 my-1"></div>
                            
                            <button
                              onClick={() => deleteConversation(conversation._id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:bg-[#414141] transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              </div>

              {/* Mobile User Profile Section */}
              <div className="mt-auto p-2 border-t border-white/10">
                <div className="flex items-center gap-2 p-1.5 rounded hover:bg-[#414141] transition-colors">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "h-6 w-6",
                        userButtonPopoverCard: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg",
                        userButtonPopoverActionButton: "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                        userButtonPopoverFooter: "hidden",
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {user?.fullName || user?.firstName || 'User Account'}
                    </div>
                    <div className="text-xs text-white/60">
                      Free Plan
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
