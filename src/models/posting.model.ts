// src\models\posting.model.ts
import mongoose,{ Schema, model } from "mongoose";

const PostingSchema = new Schema({
  platform:  { type: String, enum: ["facebook"], required: true },
  pageId:    { type: String, required: true },
  postId:    { type: Schema.Types.ObjectId, ref: "Post", required: true },
  variantId: { type: String, required: true },
  utmSlug:   { type: String, required: true },      // from UtmMap.slug
  utmId:     { type: Schema.Types.ObjectId, ref: "UtmMap", required: true },
  fbPostId:  { type: String },                       // from Graph API this generated after publishing from facebook that use to fetch insights update or delete post lik that
  status:    { type: String, enum: ["queued","publishing","published","failed"], default: "queued", index: true },
  error:     { type: String },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const Posting = mongoose.models.Posting || model("Posting", PostingSchema); //check if model already exists (to avoid overwrite model error in dev with hot reload)
