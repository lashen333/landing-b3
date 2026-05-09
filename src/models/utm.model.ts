// src\models\utm.model.ts
import mongoose,{ Schema, model} from "mongoose";

const UtmMapSchema = new Schema({
  slug:      { type: String, unique: true, index: true }, // for short link for the easy access
  targetUrl: { type: String, required: true },            // resolved landing URL with utm_*
  platform:  { type: String, enum: ["facebook"], required: true },
  pageId:    { type: String, required: true },            // FB pageId
  postId:    { type: Schema.Types.ObjectId, ref: "Post", required: true },
  variantId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

export const UtmMap = mongoose.models.UtmMap || model("UtmMap", UtmMapSchema);
