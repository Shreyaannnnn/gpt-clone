"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

/**
 * Type definitions for the chat interface
 */
type Attachment = { url: string; type: string; name?: string; size?: number };
type UIMsg = { id: string; role: "user" | "assistant" | "system"; content: string; data?: { attachments?: Attachment[] } };
type Conversation = { _id: string; title: string; createdAt: string; updatedAt: string };

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
	const [editingId, setEditingId] = useState<string | null>(null);
	const { user } = useUser();

	// Local chat state (replace useChat hook)
	const [messages, setMessages] = useState<UIMsg[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [localInput, setLocalInput] = useState<string>("");
	const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isListening, setIsListening] = useState<boolean>(false);
	const recognitionRef = useRef<any>(null);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
	const [contextMenu, setContextMenu] = useState<{ conversationId: string; x: number; y: number } | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState<string>("");
	const [showDropdown, setShowDropdown] = useState<string | null>(null);
	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [showSearch, setShowSearch] = useState<boolean>(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

	useEffect(() => {
		containerRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	// Fetch conversations on component mount and when user changes
	useEffect(() => {
		if (user) {
			// Clear existing conversations when user changes
			setConversations([]);
			setMessages([]);
			setConversationId(null);
			fetchConversations();
		}
	}, [user]);

	// Close context menu when clicking outside
	useEffect(() => {
		function handleClickOutside() {
			closeContextMenu();
		}
		
		if (contextMenu) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	}, [contextMenu]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside() {
			closeDropdown();
		}
		
		if (showDropdown) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	}, [showDropdown]);

	// Close mobile menu when clicking outside
	useEffect(() => {
		function handleClickOutside() {
			setMobileMenuOpen(false);
		}
		
		if (mobileMenuOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	}, [mobileMenuOpen]);

	/**
	 * Fetches all conversations from the API
	 */
	async function fetchConversations() {
		try {
			setLoadingConversations(true);
			// Add cache-busting parameter to ensure fresh data
			const response = await fetch(`/api/conversations?t=${Date.now()}`);
			if (response.ok) {
				const data = await response.json();
				setConversations(data.conversations || []);
			}
		} catch (error) {
			console.error('Error fetching conversations:', error);
		} finally {
			setLoadingConversations(false);
		}
	}

	/**
	 * Filters conversations based on search query
	 */
	const filteredConversations = conversations.filter(conversation =>
		conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
	);

	/**
	 * Loads a specific conversation by ID
	 */
	async function loadConversation(conversationId: string) {
		try {
			setIsLoading(true);
			setError(null);
			
			// Fetch conversation messages
			const response = await fetch(`/api/conversations/${conversationId}/messages`);
			if (response.ok) {
				const data = await response.json();
				setMessages(data.messages || []);
				setConversationId(conversationId);
			} else {
				setError('Failed to load conversation');
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
			setError('Failed to load conversation');
		} finally {
			setIsLoading(false);
		}
	}

	/**
	 * Handles three-dots dropdown menu
	 */
	function handleDropdownClick(event: React.MouseEvent, conversationId: string) {
		event.preventDefault();
		event.stopPropagation();
		setShowDropdown(conversationId);
	}

	/**
	 * Closes dropdown menu
	 */
	function closeDropdown() {
		setShowDropdown(null);
	}

	/**
	 * Handles right-click context menu
	 */
	function handleContextMenu(event: React.MouseEvent, conversationId: string) {
		event.preventDefault();
		event.stopPropagation();
		setContextMenu({
			conversationId,
			x: event.clientX,
			y: event.clientY,
		});
	}

	/**
	 * Closes context menu
	 */
	function closeContextMenu() {
		setContextMenu(null);
	}

	/**
	 * Handles share conversation
	 */
	function handleShare(conversationId: string) {
		// For now, just copy the conversation ID to clipboard
		navigator.clipboard.writeText(conversationId);
		closeContextMenu();
		closeDropdown();
		// You could show a toast notification here
	}

	/**
	 * Handles rename conversation
	 */
	function handleRename(conversationId: string) {
		const conversation = conversations.find(c => c._id === conversationId);
		if (conversation) {
			setRenameValue(conversation.title);
			setRenamingId(conversationId);
		}
		closeContextMenu();
		closeDropdown();
	}

	/**
	 * Saves the renamed conversation
	 */
	async function saveRename() {
		if (!renamingId || !renameValue.trim()) return;
		
		try {
			const response = await fetch(`/api/conversations/${renamingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: renameValue.trim() }),
			});
			
			if (response.ok) {
				setConversations(prev => 
					prev.map(conv => 
						conv._id === renamingId 
							? { ...conv, title: renameValue.trim() }
							: conv
					)
				);
			}
		} catch (error) {
			console.error('Error renaming conversation:', error);
		} finally {
			setRenamingId(null);
			setRenameValue("");
		}
	}

	/**
	 * Deletes a conversation
	 */
	async function deleteConversation(conversationIdToDelete: string) {
		try {
			const response = await fetch(`/api/conversations?id=${conversationIdToDelete}`, {
				method: 'DELETE',
			});
			
			if (response.ok) {
				// Remove from local state
				setConversations(prev => prev.filter(conv => conv._id !== conversationIdToDelete));
				
				// If this was the current conversation, start a new chat
				if (conversationId === conversationIdToDelete) {
					startNewChat();
				}
			}
		} catch (error) {
			console.error('Error deleting conversation:', error);
		}
		closeContextMenu();
		closeDropdown();
	}

	/**
	 * Resets the entire conversation state to start a new chat
	 * Clears messages, input, files, and stops any ongoing operations
	 */
	function startNewChat() {
		// Reset all conversation state
		setMessages([]);
		setLocalInput("");
		setFiles([]);
		setEditingId(null);
		setConversationId(null);
		setError(null);
		setIsLoading(false);
		setShowAttachMenu(false);
		
		// Stop any ongoing speech recognition
		if (recognitionRef.current) {
			recognitionRef.current.stop();
			setIsListening(false);
		}
		
		// Abort any ongoing requests
		if (abortRef.current) {
			abortRef.current.abort();
		}
		
		// Refresh conversations list
		fetchConversations();
	}

	function triggerFilePicker() {
		fileInputRef.current?.click();
		setShowAttachMenu(false);
	}

	/**
	 * Initiates speech-to-text functionality
	 * Handles browser compatibility, HTTPS requirements, and microphone permissions
	 * Falls back gracefully with user-friendly error messages
	 */
	function startListening() {
		// Check if we're on HTTPS or localhost
		if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
			alert('Speech recognition requires HTTPS. Please access this site via HTTPS or localhost.');
			return;
		}

		if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
			alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
			return;
		}

		// Check microphone permission first
		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => {
					// Permission granted, proceed with speech recognition
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
		recognition.maxAlternatives = 1;

		recognition.onstart = () => {
			setIsListening(true);
		};

		recognition.onresult = (event: any) => {
			const transcript = event.results[0][0].transcript;
			setLocalInput(prev => prev + transcript);
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognition.onerror = (event: any) => {
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
				case 'aborted':
					// User manually stopped, no need to show error
					break;
				default:
					console.error('Speech recognition error:', event.error);
					alert(`Speech recognition failed (${event.error}). Please try again or type your message instead.`);
			}
		};

		try {
			recognitionRef.current = recognition;
			recognition.start();
		} catch (error) {
			console.error('Failed to start speech recognition:', error);
			alert('Failed to start speech recognition. Please try again or type your message instead.');
			setIsListening(false);
		}
	}

	function stopListening() {
		if (recognitionRef.current) {
			recognitionRef.current.stop();
			setIsListening(false);
		}
	}

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		const current = localInput || "";
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
		setMessages(prev => [...prev, userMsg, { id: crypto.randomUUID(), role: "assistant", content: "" }]);
		setError(null);
		setIsLoading(true);
		setLocalInput("");
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		try {
			await streamAssistant([...messages, userMsg], controller);
		} catch (err) {
			setError(String(err));
		} finally {
			setIsLoading(false);
		}
		setEditingId(null);
	};

	const handleEdit = (m: UIMsg) => {
		setLocalInput(m.content);
		setEditingId(m.id);
	};

	const confirmEditAndRegenerate = async () => {
		if (!editingId) return;
		// Replace the targeted user message and drop any following assistant message to regenerate
		const idx = messages.findIndex(m => m.id === editingId);
		if (idx === -1) return;
		const updated = messages.slice(0, idx + 1).map((m, i) => (i === idx ? { ...m, content: localInput } : m));
		setMessages(updated);
		setEditingId(null);
		setError(null);
		setIsLoading(true);
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		try {
			await streamAssistant(updated, controller);
		} catch (err) {
			setError(String(err));
		} finally {
			setIsLoading(false);
		}
	};

	const regenerateLast = async () => {
		setError(null);
		setIsLoading(true);
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		try {
			await streamAssistant(messages, controller);
		} catch (err) {
			setError(String(err));
		} finally {
			setIsLoading(false);
		}
	};

	async function getUploadSignature() {
		const res = await fetch("/api/upload/signature");
		if (!res.ok) throw new Error("Failed to get signature");
		return res.json() as Promise<{ timestamp: number; signature: string }>;
	}

	async function uploadFiles(selected: File[]): Promise<Attachment[]> {
		const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
		const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string | undefined;
		const { timestamp, signature } = await getUploadSignature();
		const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as any;
		const attachments: Attachment[] = [];
		for (const file of selected) {
			const form = new FormData();
			form.append("file", file);
			if (preset) form.append("upload_preset", preset);
			form.append("timestamp", String(timestamp));
			form.append("signature", signature);
			form.append("api_key", (apiKey || "").toString());
			const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
				method: "POST",
				body: form,
			});
			const json = await res.json();
			attachments.push({ url: json.secure_url, type: file.type || "application/octet-stream", name: file.name, size: file.size });
		}
		return attachments;
	}

	async function streamAssistant(history: UIMsg[], controller: AbortController) {
		const payload = {
			conversationId: conversationId || undefined,
			messages: history.map(m => ({ 
				role: m.role, 
				content: m.content, 
				...(m.data?.attachments && { attachments: m.data.attachments })
			})),
		};
		const res = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		const newConvoId = res.headers.get("x-conversation-id");
		if (newConvoId) {
			setConversationId(newConvoId);
			// Refresh conversations list when a new conversation is created
			fetchConversations();
		}
		if (!res.ok || !res.body) throw new Error("Failed to stream response");
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			const chunk = decoder.decode(value);
			setMessages(prev => {
				const next = [...prev];
				const idx = next.length - 1;
				if (idx >= 0 && next[idx]?.role === "assistant") {
					next[idx] = { 
						...next[idx], 
						content: (next[idx]?.content || '') + chunk,
						id: next[idx]?.id || `assistant-${Date.now()}`,
						role: next[idx]?.role || 'assistant',
						...(next[idx]?.data && { data: next[idx].data })
					};
				}
				return next;
			});
		}
	}

	return (
		<div className={`w-full h-screen grid grid-cols-1 md:grid-rows-[56px_1fr_auto] bg-[#303030] text-[#ECECF1] transition-all duration-300 ${sidebarCollapsed ? 'md:grid-cols-[48px_1fr]' : 'md:grid-cols-[200px_1fr]'}`}>
			{/* Header */}
			<header className="col-start-1 md:col-start-2 col-end-3 row-start-1 row-end-2 flex items-center justify-between px-4 border-b border-white/10 sticky top-0 z-10">
				{/* Mobile Hamburger Menu */}
				<button
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					className="md:hidden p-2 rounded hover:bg-[#414141] transition-colors cursor-pointer"
					aria-label="Toggle menu"
				>
					<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				
				{/* Title */}
				<div className="text-sm font-medium text-white">ChatGPT</div>
				
				{/* Spacer for mobile layout */}
				<div className="md:hidden w-9"></div>
			</header>

			{/* Sidebar */}
			<aside className={`col-start-1 col-end-2 row-start-1 row-end-4 border-r border-white/10 bg-[#212121] hidden md:flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:w-12' : 'md:w-48'}`}>
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
							className="w-full px-2 py-1.5 text-xs bg-[#303030] border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
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
										>
											<svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
												<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
											</svg>
										</button>
										
										{/* Dropdown menu */}
										{showDropdown === conversation._id && (
											<div className="absolute right-0 top-0 mt-6 bg-[#2D2D2D] border border-white/10 rounded shadow-lg py-1 min-w-[140px] z-50">
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
					<aside className="fixed left-0 top-0 h-full w-64 bg-[#212121] border-r border-white/10 z-50 md:hidden transform transition-transform duration-300">
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
									className="w-full px-2 py-1.5 text-xs bg-[#303030] border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-white/40"
									autoFocus
								/>
							</div>
						)}

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
												>
													<svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
														<path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
													</svg>
												</button>
												
												{/* Dropdown menu */}
												{showDropdown === conversation._id && (
													<div className="absolute right-0 top-0 mt-6 bg-[#2D2D2D] border border-white/10 rounded shadow-lg py-1 min-w-[140px] z-50">
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
						<div className="p-2 border-t border-white/10">
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
					</aside>
				</>
			)}

			{/* Context Menu */}
			{contextMenu && (
				<div
					className="fixed z-50 bg-[#2D2D2D] border border-white/10 rounded-lg shadow-lg py-1 min-w-[160px]"
					style={{
						left: contextMenu.x,
						top: contextMenu.y,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<button
						onClick={() => handleShare(contextMenu.conversationId)}
						className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#414141] transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
						</svg>
						Share
					</button>
					
					<button
						onClick={() => handleRename(contextMenu.conversationId)}
						className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-[#414141] transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
						Rename
					</button>
					
					<div className="border-t border-white/10 my-1"></div>
					
					<button
						onClick={() => deleteConversation(contextMenu.conversationId)}
						className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-[#414141] transition-colors"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Delete
					</button>
				</div>
			)}

			{/* Messages */}
			<main className="col-start-1 md:col-start-2 col-end-3 row-start-2 row-end-3 overflow-auto" ref={containerRef} aria-live="polite" aria-atomic="false" role="log">
				<div className="max-w-3xl mx-auto w-full px-4 sm:px-6 md:px-8 py-4">
					{messages.length === 0 && (
						<div className="text-center flex items-center justify-center" style={{ minHeight: "calc(100vh - 112px)" }}>
							<div className="w-full max-w-2xl px-4">
								<div className="text-[22px] md:text-[28px] font-medium text-white/90">Ready when you are.</div>
								<div className="mt-6">
									<div className="relative">
										<button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center cursor-pointer" aria-label="Attach">
											<span className="text-lg leading-none">+</span>
										</button>
										<input
											value={localInput}
											onChange={(e) => setLocalInput(e.target.value)}
											placeholder="Ask anything"
											className="w-full h-12 md:h-14 rounded-full bg-[#1E1F20] border border-white/10 pl-12 pr-24 text-sm text-white placeholder:text-white/40 focus:outline-none"
											onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(e as any); } }}
										/>
										<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
											{localInput.trim().length > 0 ? (
												<button onClick={handleSend as any} className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer" aria-label="Send">
													<span className="text-[15px]">↑</span>
												</button>
											) : (
												<button type="button" onClick={isListening ? stopListening : startListening} className={`h-10 w-10 rounded-full flex items-center justify-center cursor-pointer ${isListening ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70'}`} aria-label={isListening ? "Stop listening" : "Start voice input"}>
													<span className="text-[15px]">{isListening ? '⏹' : '🎤'}</span>
												</button>
											)}
										</div>
										{showAttachMenu && (
											<div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-white/10 bg-[#1E1F20] text-left shadow-lg">
												<button type="button" onClick={triggerFilePicker} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 cursor-pointer">Add photos & files</button>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}

					{messages.length > 0 && (
						<div className="space-y-3">
							{messages.map((m) => (
								<div key={m.id} className={(m.role === "user" ? "bg-white dark:bg-[#131314] border border-black/10 dark:border-white/10 " : "bg-[#F7F7F8] dark:bg-[#1F1F20] ") + "rounded-xl message-enter message-enter-active"}>
									<div className="p-4 flex gap-3">
										<div className="h-7 w-7 rounded-sm bg-black/10 dark:bg-white/10 shrink-0" aria-hidden />
										<div className="min-w-0 flex-1">
											<div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
											{"data" in m && (m as any).data?.attachments?.length ? (
												<div className="mt-3 flex flex-wrap gap-2">
													{(m as any).data.attachments.map((a: Attachment, i: number) => (
														<a key={i} href={a.url} target="_blank" className="text-xs underline break-all">
															{a.name || a.url}
														</a>
													))}
												</div>
											) : null}
											{m.role === "user" ? (
												<div className="mt-2">
													<button onClick={() => handleEdit(m)} className="text-xs text-black/60 dark:text-white/60 hover:underline cursor-pointer">Edit</button>
												</div>
											) : null}
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{isLoading && (
						<div className="mt-4 text-center text-xs text-black/50 dark:text-white/50">Generating...</div>
					)}
					{error && (
						<div className="mt-4 text-center text-xs text-red-600">{String(error)}</div>
					)}
				</div>
			</main>

			{/* Composer only when conversation has started */}
			{messages.length > 0 && (
				<form onSubmit={editingId ? (e) => { e.preventDefault(); void confirmEditAndRegenerate(); } : handleSend} className="col-start-1 md:col-start-2 col-end-3 row-start-3 row-end-4">
					<div className="max-w-3xl mx-auto w-full px-4 sm:px-6 md:px-8 py-3">
						<div className="relative">
							<button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 bottom-2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center cursor-pointer" aria-label="Attach">
								<span className="text-lg leading-none">+</span>
							</button>
							<textarea
								aria-label="Message"
								value={localInput}
								onChange={(e) => { setLocalInput(e.target.value); }}
								placeholder="Message ChatGPT"
								className="w-full resize-none rounded-2xl border border-white/10 bg-[#1E1F20] text-white pl-12 py-3 pr-28 text-sm placeholder:text-white/40 focus:outline-none"
								rows={1}
								onInput={(e) => {
									const el = e.currentTarget;
									el.style.height = "auto";
									el.style.height = `${Math.min(200, el.scrollHeight)}px`;
								}}
							/>
							<div className="absolute right-2 bottom-2 flex items-center gap-2">
								{isLoading ? (
									<button type="button" onClick={() => abortRef.current?.abort()} className="h-8 px-3 rounded-md text-xs border border-white/10 text-white cursor-pointer">Stop</button>
								) : (
									<button type="submit" className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center cursor-pointer" aria-label="Send"><span className="text-[15px]">↑</span></button>
								)}
								{messages.length > 0 && !isLoading && (
									<button type="button" onClick={regenerateLast} className="h-8 px-3 rounded-md text-xs border border-white/10 text-white/80 cursor-pointer">Regenerate</button>
								)}
								{showAttachMenu && (
									<div className="absolute left-0 bottom-full mb-2 w-72 rounded-xl border border-white/10 bg-[#1E1F20] text-left shadow-lg">
										<button type="button" onClick={triggerFilePicker} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 cursor-pointer">Add photos & files</button>
									</div>
								)}
							</div>
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
			)}

			{/* Hidden file input for attachments */}
			<input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
		</div>
	);
}



