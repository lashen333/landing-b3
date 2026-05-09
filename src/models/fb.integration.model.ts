// src\models\fb.integration.model.ts
import mongoose, { Schema, model, type Model } from "mongoose";

export type FbUser = {
  fbUserId: string;
  name?: string;
  userToken: string;
  tokenExpiresAt?: Date;
};

export type FbPage = {
  pageId: string;
  name?: string;
  category?: string;
  pictureUrl?: string;
  pageToken: string;
  connectedAt?: Date;
};

export interface FacebookIntegrationDoc {
  _id: any;
  provider: "facebook";
  fbUser: FbUser;
  pages: FbPage[];
  createdAt: Date;
}

const FbUserSchema = new Schema<FbUser>({
  fbUserId: { type: String, index: true },
  name: String,
  userToken: String,
  tokenExpiresAt: Date,
}, { _id: false });

const FbPageSchema = new Schema<FbPage>({
  pageId: { type: String},
  name: String,
  category: String,
  pictureUrl: String,
  pageToken: String,
  connectedAt: { type: Date, default: Date.now },
}, { _id: false });

const FacebookIntegrationSchema = new Schema<FacebookIntegrationDoc>({
  provider: { type: String, enum: ["facebook"], default: "facebook", index: true },
  fbUser: { type: FbUserSchema, required: true },
  pages: { type: [FbPageSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

/* Optional: ensure no duplicate pageIds across docs */
FacebookIntegrationSchema.index({ "pages.pageId": 1 }, { unique: true, sparse: true });

export const FacebookIntegration: Model<FacebookIntegrationDoc> =
  (mongoose.models.FacebookIntegration as Model<FacebookIntegrationDoc>) ||
  model<FacebookIntegrationDoc>("FacebookIntegration", FacebookIntegrationSchema);
