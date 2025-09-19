"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { UIMsg, Attachment } from "@/types/chat";
import { useState, useEffect } from "react";

interface MessageListProps {
  messages: UIMsg[];
  isLoading: boolean;
  showMoreOptions: string | null;
  setShowMoreOptions: (id: string | null) => void;
  handleEdit: (message: UIMsg) => void;
  regenerateLast: () => void;
  editingId: string | null;
  localInput: string;
  setLocalInput: (input: string) => void;
  confirmEditAndRegenerate: () => void;
}

export default function MessageList({
  messages,
  isLoading,
  showMoreOptions,
  setShowMoreOptions,
  handleEdit,
  regenerateLast,
  editingId,
  localInput,
  setLocalInput,
  confirmEditAndRegenerate,
}: MessageListProps) {
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessages(prev => new Set(prev).add(messageId));
      
      // Remove from copied set after 2 seconds
      setTimeout(() => {
        setCopiedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };
  return (
    <>
      {messages.length > 0 && (
        <div className="space-y-6">
          {messages.map((m) => (
            <div key={m.id} className="message-enter message-enter-active">
              {m.role === "user" ? (
                // User message - right aligned with hover actions
                <div className="flex justify-end group w-full">
                  <div className={`relative ${editingId === m.id ? 'w-full' : 'w-fit'}`}>
                    {editingId === m.id ? (
                      // Inline editing mode
                      <div className="bg-[#313131] rounded-2xl px-4 py-3 w-full">
                        <textarea
                          value={localInput}
                          onChange={(e) => setLocalInput(e.target.value)}
                          className="w-full bg-transparent text-white text-sm resize-none focus:outline-none px-4 py-2"
                          rows={Math.max(1, localInput.split('\n').length)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              confirmEditAndRegenerate();
                            }
                            if (e.key === 'Escape') {
                              handleEdit(m); // Cancel editing
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(m)}
                            className="px-3 py-1 text-xs text-white/60 hover:text-white/80 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmEditAndRegenerate}
                            className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer"
                          >
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal display mode
                      <>
                        <div className="bg-[#313131] rounded-2xl px-4 py-3 w-fit">
                          <div className="text-white text-sm whitespace-pre-wrap break-words" style={{ wordBreak: 'normal', overflowWrap: 'normal' }}>{m.content}</div>
                          {"data" in m && (m as any).data?.attachments?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(m as any).data.attachments.map((a: Attachment, i: number) => (
                                <a key={i} href={a.url} target="_blank" className="text-xs text-white/70 underline break-all">
                                  {a.name || a.url}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {/* Hover actions for user message */}
                        <div className="absolute -bottom-6 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopy(m.content, m.id)}
                            className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                            title={copiedMessages.has(m.id) ? "Copied!" : "Copy"}
                          >
                            {copiedMessages.has(m.id) ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            )}
                          </button>
                          <button 
                            onClick={() => handleEdit(m)}
                            className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Assistant message - left aligned, no background, with action buttons
                <div className="flex justify-start">
                  <div className="max-w-[90%]">
                    <div className="text-white text-sm mb-4 prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          code: ({ node, className, children, ...props }: any) => {
                            const inline = !className?.includes('language-');
                            return !inline ? (
                              <div className="relative">
                                <pre className="bg-[#181818] rounded-lg p-4 overflow-x-auto">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                                <button
                                  onClick={() => handleCopy(String(children), `code-${m.id}-${Math.random()}`)}
                                  className="absolute top-2 right-2 p-1 text-white/40 hover:text-white/60 cursor-pointer"
                                  title="Copy code"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <code className="bg-[#212121] px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <>{children}</>,
                          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-2 ml-4">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-2 ml-4">{children}</ol>,
                          li: ({ children }) => <li className="text-white leading-relaxed">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-white/20 pl-4 italic text-white/80 mb-2">
                              {children}
                            </blockquote>
                          ),
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-3 text-white">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-3 text-white">{children}</h3>,
                          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {/* Action buttons for assistant message */}
                    <div className="flex gap-3 items-center">
                      <button 
                        onClick={() => handleCopy(m.content, m.id)}
                        className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                        title={copiedMessages.has(m.id) ? "Copied!" : "Copy"}
                      >
                        {copiedMessages.has(m.id) ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        )}
                      </button>
                      <button 
                        className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                        title="Thumbs up"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                      </button>
                      <button 
                        className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                        title="Thumbs down"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                        </svg>
                      </button>
                      <button 
                        className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                        title="Share"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16,6 12,2 8,6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => regenerateLast()}
                        className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                        title="Regenerate"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23,4 23,10 17,10"/>
                          <polyline points="1,20 1,14 7,14"/>
                          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                        </svg>
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setShowMoreOptions(showMoreOptions === m.id ? null : m.id)}
                          className="p-1 text-white/40 hover:text-white/60 cursor-pointer"
                          title="More options"
                          data-dropdown-button
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="19" cy="12" r="1"/>
                            <circle cx="5" cy="12" r="1"/>
                          </svg>
                        </button>
                        {showMoreOptions === m.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-white/10 bg-[#1E1F20] shadow-lg z-10" data-dropdown-menu>
                            <button 
                              onClick={() => {
                                if ('speechSynthesis' in window) {
                                  const utterance = new SpeechSynthesisUtterance(m.content);
                                  utterance.rate = 0.9;
                                  utterance.pitch = 1;
                                  utterance.volume = 1;
                                  speechSynthesis.speak(utterance);
                                }
                                setShowMoreOptions(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 cursor-pointer flex items-center gap-3"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                              </svg>
                              Read aloud
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 text-center text-xs text-black/50 dark:text-white/50">Generating...</div>
      )}
    </>
  );
}
