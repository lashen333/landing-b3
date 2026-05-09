// src\models\post.model.ts
import mongoose,{ Schema, model,  type Model } from "mongoose";

/* TS types */
export type PostVariant = {
  variantId: string;
  headline: string;
  caption?: string;
  cta?: string;
  style?: string;
  createdAt?: Date;
};

export type Analysis = {
  kind: "image" | "video" | "text";
  summary?: string;
  topics?: string[];
  keywords?: string[];
  colors?: string[];
  ocrText?: string;
  objects?: { label: string; confidence: number }[];
  sentiment?: "positive" | "neutral" | "negative";
  safety?: string[];
  raw?: unknown;
  analyzedAt?: Date;
};

export interface PostDoc {
  _id: any;
  supabaseId: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  title?: string;
  source: string;
  tags: string[];
  status: "stored" | "analyzing" | "ready" | "failed" | "generating" | "variants_ready";
  analysis: Analysis | null;
  variants: PostVariant[];
  createdAt: Date;
}

/* Schemas (typed with generics) */
const AnalysisSchema = new Schema<Analysis>({
  kind: { type: String, enum: ["image", "video", "text"], required: true },
  summary: String,
  topics: [String],
  keywords: [String],
  colors: [String],
  ocrText: String,
  objects: [{ label: String, confidence: Number }],
  sentiment: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" },
  safety: { type: [String], default: [] },
  raw: Schema.Types.Mixed,
  analyzedAt: { type: Date, default: Date.now },
}, { _id: false });

const VariantSchema = new Schema<PostVariant>({
  variantId: { type: String, required: true },
  headline: { type: String, required: true },
  caption: String,
  cta: String,
  style: { type: String, default: "default" },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const PostSchema = new Schema<PostDoc>({
  supabaseId: { type: String, required: true, index: true, unique: true },
  url: { type: String, required: true },
  filename: { type: String, required: true },
  mime: { type: String, required: true },
  size: { type: Number, required: true },
  title: String,
  source: { type: String, default: "manual" },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ["stored","analyzing","ready","failed","generating","variants_ready"], default: "stored", index: true },
  analysis: { type: AnalysisSchema, default: null },
  variants: { type: [VariantSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const PostModel: Model<PostDoc> =
  (mongoose.models.Post as Model<PostDoc>) || model<PostDoc>("Post", PostSchema);
