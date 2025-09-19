import { Schema, model, models, Document, Types } from "mongoose";

export interface MessageDoc extends Document {
	conversationId: Types.ObjectId;
	userId?: string;
	role: "user" | "assistant" | "system";
	content: string;
	attachments?: Array<{
		url: string;
		type: string;
		name?: string;
		size?: number;
	}>;
	editedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const MessageSchema = new Schema<MessageDoc>(
	{
		conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
		userId: String,
		role: { type: String, enum: ["user", "assistant", "system"], required: true },
		content: { type: String, required: true },
		attachments: [
			{
				url: { type: String, required: true },
				type: { type: String, required: true },
				name: String,
				size: Number,
			},
		],
		editedAt: Date,
	},
	{ timestamps: true }
);

export interface ConversationDoc extends Document {
	title: string;
	userId?: string;
	summary?: string;
	createdAt: Date;
	updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDoc>(
	{
		title: { type: String, required: true },
		userId: String,
		summary: String,
	},
	{ timestamps: true }
);

export const Conversation = models.Conversation || model<ConversationDoc>("Conversation", ConversationSchema);
export const Message = models.Message || model<MessageDoc>("Message", MessageSchema);


