import { detectAts } from "./atsDetect";

// ── known ATS patterns ────────────────────────────────────────────────────────

describe("detectAts — known ATS platforms", () => {
  test.each([
    ["Workday",            "https://acme.myworkday.com/acme/d/task/1422$3062.htmld"],
    ["Workday",            "https://acme.myworkdayjobs.com/en-US/jobs/job/123"],
    ["Greenhouse",         "https://boards.greenhouse.io/acme/jobs/123456"],
    ["Lever",              "https://jobs.lever.co/acme/abc-123"],
    ["Ashby",              "https://jobs.ashby.hr/acme/job/engineer-123"],
    ["Ashby",              "https://jobs.ashbyhq.com/acme/abc-def"],
    ["iCIMS",              "https://acme.icims.com/jobs/1234/job"],
    ["Taleo",              "https://acme.taleo.net/careersection/2/jobdetail.ftl?job=123"],
    ["BambooHR",           "https://acme.bamboohr.com/careers/123"],
    ["SmartRecruiters",    "https://jobs.smartrecruiters.com/Acme/123456789"],
    ["Rippling",           "https://ats.rippling.com/acme/jobs/123"],
    ["JazzHR",             "https://acme.jazz.co/apply/abc123"],
    ["JazzHR",             "https://app.jazzhr.com/jobs/123"],
    ["Workable",           "https://acme.workable.com/jobs/123456"],
    ["Jobvite",            "https://jobs.jobvite.com/acme/job/abc123"],
    ["SAP SuccessFactors", "https://acme.successfactors.com/careers/jobdetails"],
    ["SAP SuccessFactors", "https://acme.successfactors.eu/careers/jobdetails"],
    ["UKG",                "https://acme.ultipro.com/ACME/JobBoard/123"],
    ["UKG",                "https://acme.ukg.com/en/careers"],
    ["Paylocity",          "https://recruiting.paylocity.com/Recruiting/Jobs/Details/123456"],
    ["Recruitee",          "https://acme.recruitee.com/o/engineer-123"],
    ["Breezy",             "https://acme.breezy.hr/p/abc123-engineer"],
  ])("detects %s from URL", (expected, url) => {
    expect(detectAts(url)).toBe(expected);
  });
});

// ── subdomain and path variations ─────────────────────────────────────────────

describe("detectAts — subdomain matching", () => {
  test("Workday subdomain (company.myworkday.com)", () => {
    expect(detectAts("https://walmart.myworkday.com/walmart/jobs")).toBe("Workday");
  });

  test("Greenhouse subdomain (boards.greenhouse.io)", () => {
    expect(detectAts("https://boards.greenhouse.io/stripe")).toBe("Greenhouse");
  });

  test("Lever jobs subdomain", () => {
    expect(detectAts("https://jobs.lever.co/stripe")).toBe("Lever");
  });
});

// ── null / invalid inputs ─────────────────────────────────────────────────────

describe("detectAts — edge cases", () => {
  test("returns null for unrecognized domain", () => {
    expect(detectAts("https://careers.example.com/job/123")).toBeNull();
  });

  test("returns null for null", () => {
    expect(detectAts(null)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(detectAts("")).toBeNull();
  });

  test("returns null for invalid URL string", () => {
    expect(detectAts("not-a-url")).toBeNull();
  });

  test("returns null for plain domain without scheme", () => {
    expect(detectAts("lever.co/acme/job")).toBeNull();
  });
});
