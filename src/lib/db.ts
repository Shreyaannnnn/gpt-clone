import mongoose from "mongoose";

let isConnected = 0 as 0 | 1;

export async function connectToDatabase(): Promise<typeof mongoose> {
	if (isConnected) return mongoose;

	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) {
		throw new Error("Missing MONGODB_URI environment variable");
	}

	// Avoid multiple connections in dev hot-reload
	if (mongoose.connection.readyState === 1) {
		isConnected = 1;
		return mongoose;
	}

	await mongoose.connect(mongoUri, {
		// Use default options compatible with Mongoose v8
	});
	isConnected = 1;
	return mongoose;
}


