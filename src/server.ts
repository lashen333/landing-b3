// src\server.ts
import app from "./app";
import {connectDB} from "./config/db";
import {env} from "./config/env";

async function main(){
    await connectDB();
    app.listen(env.PORT,()=>{
        console.log(`API listening on http://localhost:${env.PORT} `)
    });
}
main().catch((err) =>{
    console.error("Failed to start server:",err);
    process.exit(1);
});