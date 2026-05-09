// src\server.ts
import app from "./app.js";
import {connectDB} from "./config/db.js";
import {env} from "./config/env.js";

async function main(){
    await connectDB();

    const PORT = Number(process.env.PORT || env.PORT || 4000);
    app.listen(PORT,"0.0.0.0" , ()=>{
        console.log(`API listening on port ${PORT} `)
    });
}
main().catch((err) =>{
    console.error("Failed to start server:",err);
    process.exit(1);
});