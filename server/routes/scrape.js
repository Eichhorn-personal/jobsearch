const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");

// ── HTML helpers ─────────────────────────────────────────────────

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// Extract all <meta> name/property → content mappings
function extractMeta(html) {
  const meta = {};
  // Handles both attribute orderings: name/property before or after content
  const re = /<meta\b[^>]*>/gi;
  let tag;
  while ((tag = re.exec(html)) !== null) {
    const keyM = tag[0].match(/(?:name|property)=["']([^"']+)["']/i);
    const valM = tag[0].match(/content=["']([^"']*?)["']/i);
    if (keyM && valM) meta[keyM[1].toLowerCase()] = decodeEntities(valM[1]);
  }
  return meta;
}

// Walk all JSON-LD blocks looking for a JobPosting node
function extractJsonLd(html) {
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      let data = JSON.parse(m[1]);
      // Unwrap @graph arrays
      if (data["@graph"]) data = data["@graph"];
      const nodes = Array.isArray(data) ? data : [data];
      const job = nodes.find(n => n["@type"] === "JobPosting");
      if (job) {
        const role = job.title || job.name || null;
        const org = job.hiringOrganization;
        const company = typeof org === "string" ? org : (org?.name ?? null);
        if (role || company) return { role, company };
      }
    } catch { /* malformed JSON — skip */ }
  }
  return null;
}

// Strip known job-board site names from a title string
const SITE_NAMES = [
  "LinkedIn", "Indeed", "Glassdoor", "Monster", "ZipRecruiter", "Dice",
  "CareerBuilder", "SimplyHired", "Greenhouse", "Lever", "Workday",
  "Workable", "Taleo", "iCIMS", "SmartRecruiters", "Jobvite",
];

function parseTitleString(title) {
  let s = title;
  for (const site of SITE_NAMES) {
    s = s.replace(new RegExp(`\\s*[|\\-–—]\\s*${site}\\b.*$`, "i"), "");
  }
  s = s.trim();

  // "Role at Company"  (LinkedIn, Glassdoor)
  const atM = s.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atM) return { role: atM[1].trim(), company: atM[2].trim() };

  // "Role - Company"  (Indeed, many ATS)
  const dashM = s.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*[-–—]\s*.+)?$/);
  if (dashM) return { role: dashM[1].trim(), company: dashM[2].trim() };

  return { role: s || null, company: null };
}

// ── Main extraction ──────────────────────────────────────────────

function extractJobData(html) {
  // 1. Structured data (most reliable)
  const ld = extractJsonLd(html);
  if (ld) return ld;

  // 2. Meta / OG tags
  const meta = extractMeta(html);
  const ogTitle = meta["og:title"] || meta["twitter:title"] || null;
  const ogSite  = meta["og:site_name"] || null;

  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleM ? decodeEntities(titleM[1]) : null;

  const titleStr = ogTitle || pageTitle;
  if (titleStr) {
    const parsed = parseTitleString(titleStr);
    // If we couldn't split role/company from the title, fall back to og:site_name as company
    if (!parsed.company && ogSite) parsed.company = ogSite;
    if (parsed.role || parsed.company) return parsed;
  }

  return { role: null, company: null };
}

// ── Route ────────────────────────────────────────────────────────

router.get("/", authenticate, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url query param required" });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs are allowed" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(parsed.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (!response.ok) return res.json({ role: null, company: null });

    const html = (await response.text()).slice(0, 512 * 1024); // cap at 512 KB
    res.json(extractJobData(html));
  } catch {
    clearTimeout(timer);
    res.json({ role: null, company: null }); // network/timeout errors are non-fatal
  }
});

module.exports = router;
