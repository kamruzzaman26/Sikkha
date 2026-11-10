"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveCustomerAvatar } from "./actions";

export function ProfileAvatarUploader({
  userId,
  avatarUrl,
}: {
  userId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = allowedTypes[file.type];
    if (!extension) {
      setMessage("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const result = await saveCustomerAvatar(path);
      if (result.error || !result.avatarUrl) {
        throw new Error(result.error || "Unable to save your profile photo.");
      }

      setPreviewUrl(result.avatarUrl);
      setMessage("Profile photo updated successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-50 text-4xl font-bold text-blue-700 shadow-md ring-1 ring-slate-200">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Profile picture" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">＋</span>
        )}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-800">Profile Picture</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose profile picture"
        disabled={uploading}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-2 inline-flex min-w-32 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
      >
        {uploading ? "Uploading..." : previewUrl ? "Change Photo" : "Upload Photo"}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">JPG, PNG or WebP · Max 5 MB</p>
      {message && (
        <p role="status" aria-live="polite" className={`mt-2 max-w-full text-center text-xs ${message.includes("successfully") ? "text-green-700" : "text-rose-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
