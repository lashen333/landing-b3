// src\middlewares\error.ts
import type {NextFunction,Request,Response} from "express";

export function errorHandler(
    err:any,
    _req:Request,
    res:Response,
    _next:NextFunction
){
    console.error("Unhandled error:",err);

    return res.status(500).json({
        ok:false,
        error:"InternalServerError",
    });
}
