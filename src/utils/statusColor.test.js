import { statusClass, STATUS_COLORS } from "./statusColor";

// ── statusClass ───────────────────────────────────────────────────────────────

describe("statusClass — pattern matching", () => {
  test.each([
    // Applied variants
    ["Applied",              "status-applied"],
    ["apply now",            "status-applied"],
    // Phone screen variants
    ["Phone Screen",         "status-phone-screen"],
    ["phone",                "status-phone-screen"],
    ["screening",            "status-phone-screen"],
    // Interview variants
    ["Interview",            "status-interview"],
    ["Technical Interview",  "status-interview"],
    ["Final Interview",      "status-interview"],
    // Offer variants
    ["Offer",                "status-offer"],
    ["Job Offer",            "status-offer"],
    // Rejected variants
    ["Rejected",             "status-rejected"],
    ["reject",               "status-rejected"],
    // Withdrawn variants
    ["Withdrawn",            "status-withdrawn"],
    ["withdraw",             "status-withdrawn"],
  ])('"%s" → %s', (input, expected) => {
    expect(statusClass(input)).toBe(expected);
  });
});

describe("statusClass — default fallback", () => {
  test("returns status-default for unrecognized status", () => {
    expect(statusClass("Ghosted")).toBe("status-default");
  });

  test("returns status-default for empty string", () => {
    expect(statusClass("")).toBe("status-default");
  });

  test("returns status-default for null", () => {
    expect(statusClass(null)).toBe("status-default");
  });

  test("returns status-default for undefined", () => {
    expect(statusClass(undefined)).toBe("status-default");
  });
});

describe("statusClass — case insensitivity", () => {
  test("APPLIED (all caps) matches applied pattern", () => {
    expect(statusClass("APPLIED")).toBe("status-applied");
  });

  test("INTERVIEW (all caps) matches interview pattern", () => {
    expect(statusClass("INTERVIEW")).toBe("status-interview");
  });

  test("mixed case Rejected matches rejected pattern", () => {
    expect(statusClass("REJECTED")).toBe("status-rejected");
  });
});

// ── STATUS_COLORS ─────────────────────────────────────────────────────────────

describe("STATUS_COLORS", () => {
  test("first entry is Auto with empty value", () => {
    expect(STATUS_COLORS[0]).toEqual({ value: "", label: "Auto" });
  });

  test("contains entries for all key status classes", () => {
    const values = STATUS_COLORS.map(c => c.value);
    expect(values).toContain("status-applied");
    expect(values).toContain("status-offer");
    expect(values).toContain("status-rejected");
    expect(values).toContain("status-withdrawn");
  });

  test("every entry has non-empty label", () => {
    STATUS_COLORS.forEach(({ label }) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
