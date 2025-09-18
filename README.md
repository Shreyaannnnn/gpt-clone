## ChatGPT Clone (Next.js + Vercel AI SDK)

Pixel-accurate ChatGPT-style chat with streaming, edit-and-regenerate, attachments (Cloudinary), MongoDB persistence, and pluggable memory.

### Prerequisites
- Node 18+
- MongoDB connection string
- OpenAI API key
- Cloudinary account (for uploads)

### Environment Variables (.env.local)
```
OPENAI_API_KEY=
MONGODB_URI=

# Server-side Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Client-side Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_API_KEY=
# Optional (unsigned uploads)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

### Install & Run
```
npm i
npm run dev
```

Visit http://localhost:3000

### Key Files
- `src/app/api/chat/route.ts`: Streaming chat via Vercel AI SDK, context trimming, persistence, lightweight memory.
- `src/components/ChatUI.tsx`: ChatGPT-like UI, streaming, edit & regenerate, file uploads.
- `src/lib/db.ts`, `src/lib/models.ts`: Mongo connection and schemas.
- `src/lib/memory.ts`: Minimal conversation memory (Mongo summary). Replace with mem0 if desired.
- `src/app/api/upload/signature/route.ts`: Cloudinary upload signature endpoint.
- `src/app/api/webhooks/route.ts`: Webhook stub.

### Deploy on Vercel
1) Push to GitHub
2) Import project in Vercel
3) Add env vars above in Vercel Project Settings → Environment Variables
4) Deploy

### Notes
- UI tuned for ChatGPT-like behavior; further spacing/animation tweaks can be applied to match new versions.
