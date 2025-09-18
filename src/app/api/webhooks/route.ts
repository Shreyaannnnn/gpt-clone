import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	const event = await req.json().catch(() => ({}));
	// Stub: log and acknowledge
	return Response.json({ received: true, event });
}


