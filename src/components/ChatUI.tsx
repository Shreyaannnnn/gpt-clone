"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UIMsg, Attachment } from "@/types/chat";

// Import components
import Header from "./Header";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

// Import hooks
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useSidebar } from "@/hooks/useSidebar";
import { useConversationActions } from "@/hooks/useConversationActions";

/**
 * Main ChatUI component - A pixel-perfect ChatGPT clone
 * 
 * Features:
 * - Real-time streaming chat with OpenAI
 * - Message editing and regeneration
 * - File upload support via Cloudinary/Uploadcare
 * - Speech-to-text functionality
 * - Conversation memory and persistence
 * - Mobile-responsive design
 * 
 * @component
 * @returns {JSX.Element} The main chat interface
 */
export default function ChatUI() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const { user } = useUser();

	// Use custom hooks
	const {
		conversations,
		setConversations,
		loadingConversations,
		searchQuery,
		setSearchQuery,
		filteredConversations,
		fetchConversations,
		debouncedFetchConversations,
	} = useConversations();

	const {
		messages,
		setMessages,
		isLoading,
		error,
		setError,
		conversationId,
		setConversationId,
		localInput,
		setLocalInput,
		editingId,
		abortRef,
		startNewChat,
		handleEdit,
		confirmEditAndRegenerate,
		regenerateLast,
		streamAssistant,
	} = useChat(fetchConversations);

	const {
		files,
		setFiles,
		showAttachMenu,
		setShowAttachMenu,
		fileInputRef,
		triggerFilePicker,
		uploadFiles,
	} = useFileUpload();

	const {
		sidebarCollapsed,
		setSidebarCollapsed,
		showSearch,
		setShowSearch,
		mobileMenuOpen,
		setMobileMenuOpen,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
	} = useSidebar();

	const {
		renamingId,
		renameValue,
		setRenameValue,
		showDropdown,
		handleDropdownClick,
		closeDropdown,
		closeContextMenu,
		handleShare,
		handleRename,
		saveRename,
		deleteConversation,
	} = useConversationActions(conversations, setConversations, conversationId, startNewChat, fetchConversations);

	// Additional state
	const [isListening, setIsListening] = useState<boolean>(false);
	const recognitionRef = useRef<any>(null);
	const [showMoreOptions, setShowMoreOptions] = useState<string | null>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		containerRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Close dropdowns and menus on outside click
	useEffect(() => {
		function handleClickOutside() {
			closeContextMenu();
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [closeContextMenu]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			// Don't close dropdown if clicking on dropdown button or dropdown menu
			const target = event.target as Element;
			if (target.closest('[data-dropdown-button]') || target.closest('[data-dropdown-menu]')) {
				return;
			}
			setShowMoreOptions(null);
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, []);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			// Don't close dropdown if clicking on dropdown button or dropdown menu
			const target = event.target as Element;
			if (target.closest('[data-dropdown-button]') || target.closest('[data-dropdown-menu]')) {
				return;
			}
			closeDropdown();
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [closeDropdown]);

	useEffect(() => {
		function handleClickOutside() {
			setMobileMenuOpen(false);
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [setMobileMenuOpen]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && mobileMenuOpen) {
				setMobileMenuOpen(false);
			}
		}
		function handleClickOutside() {
			setMobileMenuOpen(false);
		}
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('click', handleClickOutside);
		// Focus trap: prevent tabbing outside mobile sidebar
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = 'unset';
		};
	}, [mobileMenuOpen, setMobileMenuOpen]);

	// Fetch conversations on mount and when user changes
	useEffect(() => {
		if (user) {
			debouncedFetchConversations();
		}
	}, [user, debouncedFetchConversations]);

	// Speech recognition functions (currently unused but kept for future implementation)
	function startListening() {
		// Check if we're on HTTPS or localhost
		if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
			alert('Speech recognition requires HTTPS. Please access this site via HTTPS or localhost.');
			return;
		}

		// Check microphone permission first
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => {
					initSpeechRecognition();
				})
				.catch((error) => {
					console.error('Microphone permission denied:', error);
					alert('Microphone access is required for speech recognition. Please allow microphone access and try again.');
				});
		} else {
			// Fallback for older browsers
			initSpeechRecognition();
		}
	}

	function initSpeechRecognition() {
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		const recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.lang = 'en-US';

		recognition.onstart = () => {
			setIsListening(true);
		};

		recognition.onresult = (event: any) => {
			const transcript = event.results[0][0].transcript;
			setLocalInput(prev => prev + transcript);
		};

		recognition.onerror = (event: any) => {
			console.error('Speech recognition error:', event.error);
			setIsListening(false);
			
			// Handle different error types with user-friendly messages
			switch (event.error) {
				case 'network':
					alert('Network error. This might be due to:\n• Internet connectivity issues\n• Browser security policies\n• Speech recognition service unavailable\n\nPlease try again or type your message instead.');
					break;
				case 'not-allowed':
					alert('Microphone access denied. Please:\n• Click "Allow" when prompted for microphone access\n• Check your browser\'s microphone permissions\n• Try refreshing the page');
					break;
				case 'no-speech':
					alert('No speech detected. Please:\n• Speak closer to your microphone\n• Check if your microphone is working\n• Try speaking louder');
					break;
				case 'audio-capture':
					alert('No microphone found. Please:\n• Check your microphone connection\n• Make sure your microphone is not being used by another app\n• Try a different microphone');
					break;
				case 'service-not-allowed':
					alert('Speech recognition service not allowed. Please:\n• Check your browser settings\n• Try using Chrome or Edge\n• Disable any ad blockers that might interfere');
					break;
				default:
					alert(`Speech recognition failed (${event.error}). Please try again or type your message instead.`);
			}
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognitionRef.current = recognition;
		recognition.start();
	}

	function stopListening() {
		if (recognitionRef.current) {
			recognitionRef.current.stop();
		}
	}

	// Load conversation function
	async function loadConversation(conversationId: string) {
		try {
			setError(null);
			console.log('Loading conversation:', conversationId);
			
			const response = await fetch(`/api/conversations/${conversationId}/messages`);
			console.log('Messages response status:', response.status);
			
			if (response.ok) {
				const data = await response.json();
				console.log('Messages data received:', data);
				
				// Transform messages to include id field for React keys
				const messagesWithIds = (data.messages || []).map((msg: any, index: number) => ({
					...msg,
					id: msg.id || `msg-${conversationId}-${index}` // Fallback ID generation
				}));
				
				setMessages(messagesWithIds);
				setConversationId(conversationId);
			} else {
				const errorData = await response.json();
				console.error('Failed to load conversation:', errorData);
				setError('Failed to load conversation');
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
			setError('Failed to load conversation');
		}
	}

	// Handle send message
	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		const current = localInput.trim();
		if (!current.trim()) return;
		let attachments: Attachment[] = [];
		if (files.length) {
			attachments = await uploadFiles(files);
			setFiles([]);
		}
		const userMsg: UIMsg = { 
			id: crypto.randomUUID(), 
			role: "user", 
			content: current, 
			...(attachments.length > 0 && { data: { attachments } })
		};
		const updatedMessages = [...messages, userMsg];
		setMessages(prev => [...prev, userMsg, { id: crypto.randomUUID(), role: "assistant", content: "" }]);
		setLocalInput("");
		
		const controller = new AbortController();
		abortRef.current = controller;
		await streamAssistant(updatedMessages, controller);
	};

	return (
		<div 
			className={`w-full h-screen grid grid-cols-1 grid-rows-[56px_1fr_auto] md:grid-rows-[56px_1fr_auto] bg-[#212121] text-[#ECECF1] transition-all duration-300 ${sidebarCollapsed ? 'md:grid-cols-[48px_1fr]' : 'md:grid-cols-[200px_1fr]'}`}
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			{/* Skip Links for Accessibility */}
			<a 
				href="#main-content" 
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:font-medium"
			>
				Skip to main content
			</a>
			<a 
				href="#sidebar" 
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:font-medium"
			>
				Skip to sidebar
			</a>

			{/* Header */}
			<Header 
				mobileMenuOpen={mobileMenuOpen}
				setMobileMenuOpen={setMobileMenuOpen}
			/>

			{/* Sidebar */}
			<Sidebar
				sidebarCollapsed={sidebarCollapsed}
				setSidebarCollapsed={setSidebarCollapsed}
				showSearch={showSearch}
				setShowSearch={setShowSearch}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				conversations={conversations}
				loadingConversations={loadingConversations}
				filteredConversations={filteredConversations}
				conversationId={conversationId}
				renamingId={renamingId}
				renameValue={renameValue}
				setRenameValue={setRenameValue}
				showDropdown={showDropdown}
				mobileMenuOpen={mobileMenuOpen}
				setMobileMenuOpen={setMobileMenuOpen}
				startNewChat={startNewChat}
				fetchConversations={fetchConversations}
				loadConversation={loadConversation}
				handleDropdownClick={handleDropdownClick}
				handleShare={handleShare}
				handleRename={handleRename}
				saveRename={saveRename}
				deleteConversation={deleteConversation}
			/>

			{/* Main Content */}
			<main 
				id="main-content"
				className="col-start-1 md:col-start-2 col-end-3 row-start-2 row-end-3 overflow-y-auto"
				ref={containerRef} 
				aria-live="polite"
				aria-label="Chat messages"
			>
				{messages.length === 0 ? (
					/* Centered welcome message and input when no conversation */
					<div className="h-full flex flex-col items-center justify-center">
						<div className="text-center mb-8">
							<div className="text-2xl font-semibold text-white mb-2">How can I help you today?</div>
							<div className="text-sm text-white/60">Start a conversation by typing a message below.</div>
						</div>
						
						{/* Centered Input Form */}
						<div className="w-full max-w-3xl mx-auto px-4">
							<form onSubmit={handleSend} className="relative">
								<button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center cursor-pointer" style={{ alignSelf: 'anchor-center' }} aria-label="Attach">
									<span className="text-lg leading-none">+</span>
								</button>
								<textarea
									aria-label="Message"
									aria-describedby="composer-help"
									value={localInput}
									onChange={(e) => { setLocalInput(e.target.value); }}
									placeholder="Ask anything"
									className="w-full resize-none rounded-2xl border border-white/10 bg-[#1E1F20] text-white pl-12 py-3 pr-28 text-sm placeholder:text-white/40 focus:outline-none min-h-[48px] max-h-[200px] placeholder:text-white/40"
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
							</form>
							{files.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
									{files.map((f) => (
										<div key={f.name} className="px-2 py-1 border border-white/10 rounded-md">{f.name}</div>
									))}
								</div>
							)}
							<p className="mt-2 text-[11px] text-white/50">ChatGPT can make mistakes. Check important info.</p>
						</div>
					</div>
				) : (
					/* Messages when conversation exists */
					<div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 py-8">
                            <MessageList
                                messages={messages}
                                isLoading={isLoading}
                                showMoreOptions={showMoreOptions}
                                setShowMoreOptions={setShowMoreOptions}
                                handleEdit={handleEdit}
                                regenerateLast={regenerateLast}
                                editingId={editingId}
                                localInput={localInput}
                                setLocalInput={setLocalInput}
                                confirmEditAndRegenerate={confirmEditAndRegenerate}
                            />

						{error && (
							<div className="mt-4 text-center text-xs text-red-600">{String(error)}</div>
						)}
					</div>
				)}
			</main>

			{/* Chat Input - Only show when there are messages */}
			{messages.length > 0 && (
				<ChatInput
					localInput={localInput}
					setLocalInput={setLocalInput}
					isLoading={isLoading}
					editingId={editingId}
					showAttachMenu={showAttachMenu}
					setShowAttachMenu={setShowAttachMenu}
					files={files}
					setFiles={setFiles}
					fileInputRef={fileInputRef}
					handleSend={handleSend}
					confirmEditAndRegenerate={confirmEditAndRegenerate}
					abortRef={abortRef}
					triggerFilePicker={triggerFilePicker}
					hasMessages={true}
				/>
			)}

			{/* Hidden file input for attachments */}
			<input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
		</div>
	);
}
