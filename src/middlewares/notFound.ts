// src\middlewares\notFound.ts
import type {Request,Response} from "express";

export function notFound(_req:Request,res:Response){
    return res.status(404).json({
        ok:false,
        error:"NotFound",
    });
}