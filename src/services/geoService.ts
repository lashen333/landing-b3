import { env } from "../config/env";

type GeoResult = {
  country?: string;
  countryCode?: string;   // ISO-2 (LK, US…)
  city?: string;
  province?: string;
  district?: string;
  region?: string;
  village?: string;
  road?: string;
  lat?: number;
  lon?: number;
  method: "gps" | "ip" | "error";
};

function withTimeout(ms: number): AbortController {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms).unref?.();
  return c;
}

export async function lookupGeoImproved(ip?: string, lat?: number, lon?: number): Promise<GeoResult> {
  // 1) GPS → OpenCage
  if (typeof lat === "number" && typeof lon === "number") {
    try {
      if (!env.geo.opencageKey) throw new Error("Missing OPENCAGE_KEY");
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${env.geo.opencageKey}`;
      const resp = await fetch(url, { signal: withTimeout(6000).signal });
      if (!resp.ok) throw new Error(`OpenCage HTTP ${resp.status}`);
      const geoData: any = await resp.json();
      const c = geoData?.results?.[0]?.components ?? {};
      return {
        country: c.country || "",
        countryCode: (c.country_code || "").toUpperCase(),
        province: c.state || c.province || "",
        district: c.county || c.district || "",
        city: c.city || c.town || c.village || "",
        region: c.state || c.province || "",
        village: c.village || "",
        road: c.road || "",
        lat, lon, method: "gps",
      };
    } catch (e) {
      console.error("Geocode (GPS) error:", e);
    }
  }

  // 2) Fallback: IP → ipinfo
  try {
    if (!ip) return { method: "error" };
    if (!env.geo.ipinfoToken) throw new Error("Missing IPINFO_TOKEN");
    const resp = await fetch(`https://ipinfo.io/${ip}/json?token=${env.geo.ipinfoToken}`, { signal: withTimeout(5000).signal });
    if (!resp.ok) throw new Error(`ipinfo HTTP ${resp.status}`);
    const json: any = await resp.json();

    // loc is "lat,lon"
    let plat: number | undefined, plon: number | undefined;
    if (typeof json.loc === "string") {
      const [a, b] = json.loc.split(",").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) { plat = a; plon = b; }
    }
    return {
      countryCode: (json.country || "").toUpperCase(),
      country: json.country_name || "",   // may be empty; OK
      city: json.city || "",
      province: json.region || "",
      region: json.region || "",
      lat: plat, lon: plon,
      method: "ip",
    };
  } catch (err) {
    console.error("Geo lookup (IP) error:", err);
    return { method: "error" };
  }
}
