"use client";

import { useEffect, useRef, useState } from "react";

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

	// Local chat state (replace useChat hook)
	const [messages, setMessages] = useState<UIMsg[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);

	useEffect(() => {
		containerRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	// Fetch conversations on component mount
	useEffect(() => {
		fetchConversations();
	}, []);

	const [files, setFiles] = useState<File[]>([]);
	const [localInput, setLocalInput] = useState<string>("");
	const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isListening, setIsListening] = useState<boolean>(false);
	const recognitionRef = useRef<any>(null);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loadingConversations, setLoadingConversations] = useState<boolean>(false);

	/**
	 * Fetches all conversations from the API
	 */
	async function fetchConversations() {
		try {
			setLoadingConversations(true);
			const response = await fetch('/api/conversations');
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
	 * Deletes a conversation
	 */
	async function deleteConversation(conversationIdToDelete: string, event: React.MouseEvent) {
		event.stopPropagation();
		
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
		<div className="w-full h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[56px_1fr_auto] bg-[rgb(247,247,248)] dark:bg-[#212121] text-[#202123] dark:text-[#ECECF1]">
			{/* Header */}
			<header className="col-start-1 md:col-start-2 col-end-3 row-start-1 row-end-2 flex items-center justify-center border-b border-black/10 dark:border-white/10 bg-[#FFFFFF] dark:bg-[#0E0E0F] sticky top-0 z-10">
				<div className="text-sm font-medium text-gray-900 dark:text-gray-100">ChatGPT</div>
			</header>

			{/* Sidebar */}
			<aside className="col-start-1 col-end-2 row-start-1 row-end-4 border-r border-black/10 dark:border-white/10 bg-[#FFFFFF] dark:bg-[#0E0E0F] hidden md:flex flex-col">
				<div className="h-14 flex items-center px-3">
					<button 
						onClick={startNewChat}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
						New chat
					</button>
				</div>
				<div className="flex-1 overflow-auto px-2 py-2 space-y-1" aria-label="Conversations" role="navigation">
					{/* Previous conversations */}
					{loadingConversations ? (
						<div className="text-xs text-black/50 dark:text-white/50 px-2 py-1">Loading...</div>
					) : (
						conversations.map((conversation) => (
							<div key={conversation._id} className="group relative">
								<button
									onClick={() => loadConversation(conversation._id)}
									className={`w-full text-left px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
										conversationId === conversation._id 
											? 'bg-gray-100 dark:bg-gray-800' 
											: ''
									}`}
								>
									<div className="truncate text-gray-900 dark:text-gray-100">{conversation.title}</div>
									<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{new Date(conversation.updatedAt).toLocaleDateString()}
									</div>
								</button>
								
								{/* Delete button */}
								<button
									onClick={(e) => deleteConversation(conversation._id, e)}
									className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm transition-colors"
									aria-label="Delete conversation"
								>
									×
								</button>
							</div>
						))
					)}
				</div>
			</aside>

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



