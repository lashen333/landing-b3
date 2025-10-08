// src\utils\device.ts
import {UAParser} from "ua-parser-js";  // needs esModuleInterop true

export type DeviceType = "mobile" | "tablet" | "desktop";

export type DeviceInfo = {
    deviceType: DeviceType;
    device: {vendor?: string; model?: string; type?: string | undefined};
    os: {name?: string; version?: string};
    browser: {name?:string; version?: string};
    ua: string;
};

export function getDeviceInfo(uaRaw: string | undefined | null): DeviceInfo{
    const ua = uaRaw ?? "";
    const parser = new UAParser(ua);

    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    const t = (device.type || "").toLowerCase();
    const deviceType: DeviceType = 
         t === "mobile" ? "mobile"
       : t === "tablet" ? "tablet"
       : "desktop";

    return { deviceType, device, os, browser, ua };
}