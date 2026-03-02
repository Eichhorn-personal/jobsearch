const ATS_PATTERNS = [
  { name: "Workday",            test: h => h.includes("myworkday.com") || h.includes("myworkdayjobs.com") },
  { name: "Greenhouse",         test: h => h.includes("greenhouse.io") },
  { name: "Lever",              test: h => h.includes("lever.co") },
  { name: "Ashby",              test: h => h.includes("ashby.hr") || h.includes("ashbyhq.com") },
  { name: "iCIMS",              test: h => h.includes("icims.com") },
  { name: "Taleo",              test: h => h.includes("taleo.net") },
  { name: "BambooHR",           test: h => h.includes("bamboohr.com") },
  { name: "SmartRecruiters",    test: h => h.includes("smartrecruiters.com") },
  { name: "Rippling",           test: h => h.includes("rippling.com") },
  { name: "JazzHR",             test: h => h.includes("jazz.co") || h.includes("jazzhr.com") },
  { name: "Workable",           test: h => h.includes("workable.com") },
  { name: "Jobvite",            test: h => h.includes("jobvite.com") },
  { name: "SAP SuccessFactors", test: h => h.includes("successfactors.com") || h.includes("successfactors.eu") },
  { name: "UKG",                test: h => h.includes("ultipro.com") || h.includes("ukg.com") },
  { name: "Paylocity",          test: h => h.includes("paylocity.com") },
  { name: "Recruitee",          test: h => h.includes("recruitee.com") },
  { name: "Breezy",             test: h => h.includes("breezy.hr") },
];

/**
 * Detect the ATS name from a Direct Company Job Link URL.
 * Returns a display name string (e.g. "Workday") or null if unrecognised.
 */
export function detectAts(url) {
  if (!url) return null;
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const { name, test } of ATS_PATTERNS) {
    if (test(hostname)) return name;
  }
  return null;
}
