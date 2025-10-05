// src\models\variant.model.ts
import { Schema, model, type InferSchemaType } from "mongoose";

const VariantSchema = new Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  heroTitle:   { type: String, required: true, trim: true },
  heroSub:     { type: String, required: true, trim: true },
  ctaText:     { type: String, default: "Book a Free Demo" },
  ctaHref:     { type: String, default: "#contact" },

  active:      { type: Boolean, default: true },   // can be toggled off
  pinned:      { type: Boolean, default: false },  // "keep long" winner
  showCap:     { type: Number,  default: 10, min: 0 }, // total times to show
  impressions: { type: Number,  default: 0, min: 0 }, // how many times shown

}, { timestamps: true });

VariantSchema.index({ createdAt: -1 });
VariantSchema.index({ active: 1, pinned: 1 });
VariantSchema.index({ impressions: 1, showCap: 1 });

export type VariantDoc = InferSchemaType<typeof VariantSchema>;
export const Variant = model("Variant", VariantSchema);
