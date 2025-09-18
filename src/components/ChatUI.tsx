"use client";

import { useEffect, useRef, useState } from "react";

type Attachment = { url: string; type: string; name?: string; size?: number };
type UIMsg = { id: string; role: "user" | "assistant" | "system"; content: string; data?: { attachments?: Attachment[] } };

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

	const [files, setFiles] = useState<File[]>([]);
	const [localInput, setLocalInput] = useState<string>("");
	const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function triggerFilePicker() {
		fileInputRef.current?.click();
		setShowAttachMenu(false);
	}

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		const current = localInput || "";
		if (!current.trim()) return;
		let attachments: Attachment[] | undefined = undefined;
		if (files.length) {
			attachments = await uploadFiles(files);
			setFiles([]);
		}
		const userMsg: UIMsg = { id: crypto.randomUUID(), role: "user", content: current, data: { attachments } };
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
			messages: history.map(m => ({ role: m.role, content: m.content, attachments: m.data?.attachments })),
		};
		const res = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		const newConvoId = res.headers.get("x-conversation-id");
		if (newConvoId) setConversationId(newConvoId);
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
				if (idx >= 0 && next[idx].role === "assistant") {
					next[idx] = { ...next[idx], content: next[idx].content + chunk };
				}
				return next;
			});
		}
	}

	return (
		<div className="w-full h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[56px_1fr_auto] bg-[rgb(247,247,248)] dark:bg-[#212121] text-[#202123] dark:text-[#ECECF1]">
			{/* Sidebar */}
			<aside className="col-start-1 col-end-2 row-start-1 row-end-4 border-r border-black/10 dark:border-white/10 bg-[#FFFFFF] dark:bg-[#0E0E0F] hidden md:flex flex-col">
				<div className="h-14 flex items-center px-3">
					<button className="w-full rounded-md border border-black/10 dark:border-white/10 h-9 text-sm">+ New chat</button>
				</div>
				<div className="flex-1 overflow-auto px-2 py-2 space-y-1" aria-label="Conversations" role="navigation">
					<div className="text-xs px-2 py-1 text-black/50 dark:text-white/50">Today</div>
					<button className="w-full text-left px-2 py-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm">New chat</button>
				</div>
			</aside>

			{/* Header */}
			<header className="col-start-1 md:col-start-2 col-end-3 row-start-1 row-end-2 flex items-center justify-center border-b border-black/10 dark:border-white/10 bg-[#FFFFFF] dark:bg-[#0E0E0F] sticky top-0 z-10">
				<div className="text-sm font-medium">ChatGPT</div>
			</header>

			{/* Messages */}
			<main className="col-start-1 md:col-start-2 col-end-3 row-start-2 row-end-3 overflow-auto" ref={containerRef} aria-live="polite" aria-atomic="false" role="log">
				<div className="max-w-3xl mx-auto w-full px-4 sm:px-6 md:px-8 py-4">
					{messages.length === 0 && (
						<div className="text-center flex items-center justify-center" style={{ minHeight: "calc(100vh - 56px)" }}>
							<div className="w-full max-w-2xl px-4">
								<div className="text-[22px] md:text-[28px] font-medium text-white/90">Ready when you are.</div>
								<div className="mt-6">
									<div className="relative">
										<button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center" aria-label="Attach">
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
												<button onClick={handleSend as any} className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center" aria-label="Send">
													<span className="text-[15px]">↑</span>
												</button>
											) : (
												<button type="button" className="h-10 w-10 rounded-full bg白/10 text-white/70 flex items-center justify-center cursor-default" aria-label="Voice" disabled>
													<span className="text-[15px]">🎤</span>
												</button>
											)}
										</div>
										{showAttachMenu && (
											<div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-white/10 bg-[#1E1F20] text-left shadow-lg">
												<button type="button" onClick={triggerFilePicker} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5">Add photos & files</button>
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
													<button onClick={() => handleEdit(m)} className="text-xs text-black/60 dark:text-white/60 hover:underline">Edit</button>
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
							<button type="button" onClick={() => setShowAttachMenu(v => !v)} className="absolute left-2 bottom-2 h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center" aria-label="Attach">
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
									<button type="button" onClick={() => abortRef.current?.abort()} className="h-8 px-3 rounded-md text-xs border border-white/10 text-white">Stop</button>
								) : (
									<button type="submit" className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center" aria-label="Send"><span className="text-[15px]">↑</span></button>
								)}
								{messages.length > 0 && !isLoading && (
									<button type="button" onClick={regenerateLast} className="h-8 px-3 rounded-md text-xs border border-white/10 text-white/80">Regenerate</button>
								)}
								{showAttachMenu && (
									<div className="absolute left-0 bottom-full mb-2 w-72 rounded-xl border border-white/10 bg-[#1E1F20] text-left shadow-lg">
										<button type="button" onClick={triggerFilePicker} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5">Add photos & files</button>
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



