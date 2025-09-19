"use client";

import { Attachment } from "@/types/chat";

interface ChatInputProps {
  localInput: string;
  setLocalInput: (value: string) => void;
  isLoading: boolean;
  editingId: string | null;
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleSend: (e: React.FormEvent) => void;
  confirmEditAndRegenerate: () => void;
  abortRef: React.RefObject<AbortController | null>;
  triggerFilePicker: () => void;
  hasMessages: boolean;
}

export default function ChatInput({
  localInput,
  setLocalInput,
  isLoading,
  editingId,
  showAttachMenu,
  setShowAttachMenu,
  files,
  setFiles,
  fileInputRef,
  handleSend,
  confirmEditAndRegenerate,
  abortRef,
  triggerFilePicker,
  hasMessages,
}: ChatInputProps) {
  // Don't show the main input when editing a message inline
  if (editingId) {
    return null;
  }

  return (
    <>
      {/* Composer - centered when no messages, bottom when messages exist */}
      <form onSubmit={editingId ? (e) => { e.preventDefault(); void confirmEditAndRegenerate(); } : handleSend} className={`col-start-1 md:col-start-2 col-end-3 row-start-3 row-end-4 ${!hasMessages ? 'flex items-center justify-center' : ''}`}>
        <div className={`max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 ${hasMessages ? 'py-3 pb-6' : 'py-8'}`}>
          <div className="relative">
            <button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center cursor-pointer" style={{ alignSelf: 'anchor-center' }} aria-label="Attach">
              <span className="text-lg leading-none">+</span>
            </button>
            <textarea
              aria-label="Message"
              aria-describedby="composer-help"
              value={localInput}
              onChange={(e) => { setLocalInput(e.target.value); }}
              placeholder="Message ChatGPT"
              className="w-full resize-none rounded-2xl border border-white/10 bg-[#1E1F20] text-white pl-12 py-3 pr-28 text-sm placeholder:text-white/40 focus:outline-none min-h-[48px] max-h-[200px] md:placeholder:text-white/40 placeholder:text-transparent"
              rows={1}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(200, el.scrollHeight)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <div id="composer-help" className="sr-only">
              Type your message and press Enter to send, or Shift+Enter for a new line.
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2" style={{ alignSelf: 'anchor-center' }}>
              {isLoading ? (
                <button type="button" onClick={() => abortRef.current?.abort()} className="h-8 px-3 rounded-md text-xs border border-white/10 text-white cursor-pointer" style={{ alignSelf: 'anchor-center' }}>Stop</button>
              ) : (
                <button type="submit" className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer" style={{ alignSelf: 'anchor-center' }} aria-label="Send"><span className="text-[13px]">↑</span></button>
              )}
            </div>
            
            {/* Attachment dropdown - positioned relative to plus button */}
            {showAttachMenu && (
              <div className="absolute left-2 top-0 -translate-y-full mb-2 w-72 rounded-xl border border-white/10 bg-[#1E1F20] text-left shadow-lg z-10">
                <button type="button" onClick={triggerFilePicker} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 cursor-pointer">Add photos & files</button>
              </div>
            )}
          </div>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
              {files.map((f) => (
                <div key={f.name} className="px-2 py-1 border border-white/10 rounded-md">{f.name}</div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-white/50">ChatGPT can make mistakes. Check important info.</p>
        </div>
      </form>

      {/* Hidden file input for attachments */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
    </>
  );
}
