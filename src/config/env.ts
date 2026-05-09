// src\config\env.ts
import 'dotenv/config';

export const env = {
    PORT:Number(process.env.PORT ?? 4000),
    MONGODB_URI:process.env.MONGODB_URI ?? "",
    FRONTEND_ORIGIN:process.env.FRONTEND_ORIGIN ?? "*",

    OPENAI_API_KEY:process.env.OPENAI_API_KEY ?? "",
    GROQ_API_KEY:process.env.GROQ_API_KEY ?? "",

    FB_APP_ID:process.env.FB_APP_ID ?? "",
    FB_APP_SECRET:process.env.FB_APP_SECRET ?? "",
    FB_REDIRECT_URI:process.env.FB_REDIRECT_URI ?? "",
    DASHBOARD_URL:process.env.DASHBOARD_URL ?? "",
    BASE_LANDING_URL:process.env.BASE_LANDING_URL ?? "",

    geo: {
    opencageKey: process.env.OPENCAGE_KEY ?? "",
    ipinfoToken: process.env.IPINFO_TOKEN ?? "",
  },
};

for(const [name,value] of Object.entries(env)){
  if(value === ""){
    console.warn(`Missing enviromental variable: ${name}`);
  }
}