// For known job sites, only these query params are kept; everything else is stripped.
// Sites not listed fall back to the TRACKING_PARAMS blocklist.
const SITE_ALLOWLISTS = {
  "indeed.com":      new Set(["jk"]),
  "linkedin.com":    new Set([]),       // job ID is in the path
  "glassdoor.com":   new Set([]),       // job ID is in the path
  "ziprecruiter.com":new Set(["job"]),       // job ID is in the path
  "monster.com":     new Set([]),       // job ID is in the path
  "dice.com":        new Set([]),
  "greenhouse.io":   new Set(["for", "token"]),       // job ID is in the path
};

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
  "trk", "trkInfo", "trackingId", "refId", "lipi",
  "gclid", "gclsrc", "dclid", "fbclid", "msclkid", "mc_cid", "mc_eid",
  "ref", "referrer", "referral", "source", "src", "via", "icid", "cmpid",
]);

function getAllowlist(hostname) {
  for (const [domain, allowed] of Object.entries(SITE_ALLOWLISTS)) {
    if (hostname === domain || hostname.endsWith("." + domain)) return allowed;
  }
  return null;
}

export function cleanJobUrl(value) {
  if (!value) return value;
  try {
    const url = new URL(value);
    url.hash = "";
    const allowlist = getAllowlist(url.hostname);
    for (const key of [...url.searchParams.keys()]) {
      if (allowlist ? !allowlist.has(key) : (TRACKING_PARAMS.has(key) || key.startsWith("utm_"))) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function formatDate(value) {
  if (!value) return "";
  const cleaned = value.replace(/-/g, "/").trim();
  const parts = cleaned.split("/").map(p => p.trim());
  const currentYear = new Date().getFullYear();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) return cleaned;
  if (parts.length < 2) return null;
  if (parts.length === 2 && cleaned.endsWith("/")) return null;
  if (parts.some(p => p === "")) return null;

  if (parts.length === 2) {
    const [m, d] = parts;
    if (isNaN(m) || isNaN(d)) return null;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${currentYear}`;
  }

  if (parts.length === 3) {
    let [m, d, y] = parts;
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (y.length === 2) {
      const yy = parseInt(y, 10);
      y = yy < 50 ? 2000 + yy : 1900 + yy;
    }
    const year = parseInt(y, 10);
    return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
  }

  return null;
}
