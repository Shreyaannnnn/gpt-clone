"use client";

import { useState, useRef, useCallback } from "react";
import { Attachment } from "@/types/chat";

export function useFileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getUploadSignature = useCallback(async () => {
    const res = await fetch("/api/upload/signature");
    if (!res.ok) throw new Error("Failed to get signature");
    return res.json();
  }, []);

  const uploadFiles = useCallback(async (selected: File[]): Promise<Attachment[]> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
    if (!cloudName) throw new Error("Cloudinary cloud name not configured");
    const { timestamp, signature } = await getUploadSignature();
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as any;
    const attachments: Attachment[] = [];
    for (const file of selected) {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", timestamp);
      form.append("signature", signature);
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      attachments.push({ url: json.secure_url, type: file.type || "application/octet-stream", name: file.name, size: file.size });
    }
    return attachments;
  }, [getUploadSignature]);

  return {
    files,
    setFiles,
    showAttachMenu,
    setShowAttachMenu,
    fileInputRef,
    triggerFilePicker,
    uploadFiles,
  };
}
