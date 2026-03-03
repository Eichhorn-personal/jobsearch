import { formatDate, cleanJobUrl } from "./dateFormat";

// ── formatDate ────────────────────────────────────────────────────────────────

describe("formatDate", () => {
  test("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(formatDate("")).toBe("");
  });

  test("passes through MM/DD/YYYY unchanged", () => {
    expect(formatDate("01/15/2025")).toBe("01/15/2025");
    expect(formatDate("12/31/2024")).toBe("12/31/2024");
  });

  test("accepts hyphen separators", () => {
    expect(formatDate("01-15-2025")).toBe("01/15/2025");
  });

  test("pads single-digit month and day", () => {
    expect(formatDate("1/5/2025")).toBe("01/05/2025");
  });

  test("infers current year for MM/DD input", () => {
    const year = new Date().getFullYear();
    expect(formatDate("3/5")).toBe(`03/05/${year}`);
    expect(formatDate("12/25")).toBe(`12/25/${year}`);
  });

  test("two-digit year < 50 maps to 2000+", () => {
    expect(formatDate("01/15/25")).toBe("01/15/2025");
    expect(formatDate("06/30/49")).toBe("06/30/2049");
  });

  test("two-digit year >= 50 maps to 1900+", () => {
    expect(formatDate("01/15/50")).toBe("01/15/1950");
    expect(formatDate("06/30/99")).toBe("06/30/1999");
  });

  // Note: zero-padded MM/DD/YYYY passes through as-is (format already valid).
  // Validation runs on non-padded input that goes through the parse branch.
  test("returns null for invalid month (> 12) — non-padded input", () => {
    expect(formatDate("13/1/2025")).toBeNull();
  });

  test("returns null for invalid month (0) — non-padded input", () => {
    expect(formatDate("0/1/2025")).toBeNull();
  });

  test("returns null for invalid day (> 31) — non-padded input", () => {
    expect(formatDate("1/32/2025")).toBeNull();
  });

  test("returns null for invalid day (0) — non-padded input", () => {
    expect(formatDate("1/0/2025")).toBeNull();
  });

  test("returns null for trailing slash on MM/DD/ (incomplete)", () => {
    expect(formatDate("01/")).toBeNull();
  });

  test("returns null for trailing slash on MM/DD/YYYY/ (empty year part)", () => {
    expect(formatDate("01/15/")).toBeNull();
  });

  test("returns null for single part (no separator)", () => {
    expect(formatDate("15")).toBeNull();
  });
});

// ── cleanJobUrl ───────────────────────────────────────────────────────────────

describe("cleanJobUrl", () => {
  test("returns null unchanged for null", () => {
    expect(cleanJobUrl(null)).toBeNull();
  });

  test("returns empty string unchanged for empty string", () => {
    expect(cleanJobUrl("")).toBe("");
  });

  test("returns non-URL value unchanged", () => {
    expect(cleanJobUrl("not-a-url")).toBe("not-a-url");
  });

  test("strips URL fragment", () => {
    expect(cleanJobUrl("https://jobs.acme.com/job/123#apply"))
      .toBe("https://jobs.acme.com/job/123");
  });

  // LinkedIn: allowlist is empty — all params stripped
  test("LinkedIn — strips all query params", () => {
    const input = "https://www.linkedin.com/jobs/view/4168195487/?refId=abc&trackingId=xyz&trk=test";
    expect(cleanJobUrl(input)).toBe("https://www.linkedin.com/jobs/view/4168195487/");
  });

  // Indeed: only jk is allowed
  test("Indeed — keeps jk, strips tracking params", () => {
    const input = "https://www.indeed.com/viewjob?jk=abc123&utm_source=google&utm_medium=cpc";
    expect(cleanJobUrl(input)).toBe("https://www.indeed.com/viewjob?jk=abc123");
  });

  test("Indeed — strips from/vjs params not in allowlist", () => {
    const input = "https://www.indeed.com/viewjob?jk=abc123&from=serp&vjs=3";
    expect(cleanJobUrl(input)).toBe("https://www.indeed.com/viewjob?jk=abc123");
  });

  // Glassdoor: allowlist empty — all params stripped
  test("Glassdoor — strips all query params", () => {
    const input = "https://www.glassdoor.com/job-listing/Engineer.htm?jl=123&src=GD_JOB_AD&guid=xyz";
    expect(cleanJobUrl(input)).toBe("https://www.glassdoor.com/job-listing/Engineer.htm");
  });

  // ZipRecruiter: only job is allowed
  test("ZipRecruiter — keeps job param, strips others", () => {
    const input = "https://www.ziprecruiter.com/c/Acme/Job/Engineer?job=abc123&utm_source=google";
    expect(cleanJobUrl(input)).toBe("https://www.ziprecruiter.com/c/Acme/Job/Engineer?job=abc123");
  });

  // Greenhouse: for and token are allowed
  test("Greenhouse embed — keeps for and token, strips gh_src", () => {
    const input = "https://boards.greenhouse.io/embed/job_app?for=acme&token=123&gh_src=test";
    expect(cleanJobUrl(input)).toBe("https://boards.greenhouse.io/embed/job_app?for=acme&token=123");
  });

  // Unknown domain: falls back to TRACKING_PARAMS blocklist
  test("unknown domain — strips utm params, keeps custom params", () => {
    const input = "https://jobs.acme.com/job/eng-123?utm_source=linkedin&custom_id=456";
    expect(cleanJobUrl(input)).toBe("https://jobs.acme.com/job/eng-123?custom_id=456");
  });

  test("unknown domain — strips gclid and fbclid", () => {
    const input = "https://careers.example.com/job/123?gclid=abc&fbclid=xyz&ref_id=42";
    expect(cleanJobUrl(input)).toBe("https://careers.example.com/job/123?ref_id=42");
  });

  test("unknown domain — strips trk param", () => {
    const input = "https://example.com/job/123?trk=nav_responsive_tab_jobs&id=456";
    expect(cleanJobUrl(input)).toBe("https://example.com/job/123?id=456");
  });

  test("URL with no params is returned unchanged (no trailing ?)", () => {
    const input = "https://boards.greenhouse.io/acme/jobs/123456";
    expect(cleanJobUrl(input)).toBe("https://boards.greenhouse.io/acme/jobs/123456");
  });
});
