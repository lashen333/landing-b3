// src\models\session.model.ts
import { timeStamp } from "console";
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

    //Env
    device:{type:String},
    userAgent:{type:String},
    ip:{type:String},
    location:{type:String},

    //Meta
    pageUrl:{type:String},
    referrer:{type:String},

    startTime:{type:Date,default:()=>new Date()},
    actions:{type:[ActionSchema],default:[]}
},{timestamps:true});

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export const Session = model("Session",SessionSchema);