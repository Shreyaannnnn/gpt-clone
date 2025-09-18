import { NextRequest } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
	const apiSecret = process.env.CLOUDINARY_API_SECRET;
	if (!apiSecret) return new Response("Missing CLOUDINARY_API_SECRET", { status: 500 });

	const timestamp = Math.floor(Date.now() / 1000);
	const paramsToSign = `timestamp=${timestamp}`;
	const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

	return Response.json({ timestamp, signature });
}


