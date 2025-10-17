// src\utils\ip.ts
export function getClientIp(req: import("express").Request): string {
  const h = req.headers;
  const xff = (h["x-forwarded-for"] as string)?.split(",").map(s => s.trim()).filter(Boolean)[0];
  const real = (h["x-real-ip"] as string) || (h["cf-connecting-ip"] as string) || (h["true-client-ip"] as string);
  const ip = xff || real || req.socket?.remoteAddress || "";
  return ip.replace("::ffff:", "");
}
