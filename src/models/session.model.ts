// src\models\session.model.ts
import {Schema,model,type InferSchemaType} from "mongoose";

const ActionSchema = new Schema({
    section:{type:String,required:true},
    event:{type:String,required:true},
    timeSpent:{type:Number},
    timestamp:{type:Date,default:()=>new Date()}
},{_id:false});

const SessionSchema = new Schema({
    sessionId:{type:String,required:true,index:true,unique:true},

    //UTM
    utm_source:{type:String},
    utm_medium:{type:String},
    utm_campaign:{type:String},
    utm_content:{type:String},
    utm_term:{type:String},

    //geo
    country: { type: String },
    countryCode: { type: String },
    city: { type: String },
    region: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    geoMethod: { type: String },
    

    //Env
    device:{type:String},
    userAgent:{type:String},

    osName:{type:String},
    osVersion:{type:String},
    browserName:{type:String},
    browserVersion:{type:String},
    deviceVendor:{type:String},
    deviceModel:{type:String},

    
    ip:{type:String},
    location:{type:String},

    //Meta
    pageUrl:{type:String},
    referrer:{type:String},

    startTime:{type:Date,default:()=>new Date()},
    actions:{type:[ActionSchema],default:[]},

    //variants
    variantId: {type: Schema.Types.ObjectId, ref: "Variant"},
    variantName: {type: String},
},{timestamps:true});

SessionSchema.index({createdAt: -1});
SessionSchema.index({updatedAt: -1});
SessionSchema.index({ip: 1});
SessionSchema.index({utm_source: 1 });
SessionSchema.index({ utm_campaign: 1});
SessionSchema.index({"actions.event": 1, "actions.section": 1 });
SessionSchema.index({ variantId: 1});
SessionSchema.index({ countryCode: 1});
SessionSchema.index({ lat: 1, lon: 1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export const Session = model("Session",SessionSchema);