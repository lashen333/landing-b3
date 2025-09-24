// src\config\env.ts
import 'dotenv/config';

export const env = {
    PORT:Number(process.env.PORT ?? 4000),
    MONGODB_URI:process.env.MONGODB_URI ?? "",
    FRONTEND_ORIGIN:process.env.FRONTEND_ORIGIN ?? "*",
};
if(!env.MONGODB_URI){
    console.warn("MONGODB_URI is not set.Add it to your .env");
    
}