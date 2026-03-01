/**
 * Status chip color utilities shared by DataTable and AdminPage.
 */

/**
 * Derive a status CSS class from the status label text (pattern-based fallback).
 * Used when no explicit color has been stored for a dropdown option.
 */
export function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("apply") || s.includes("applied")) return "status-applied";
  if (s.includes("phone") || s.includes("screen")) return "status-phone-screen";
  if (s.includes("interview")) return "status-interview";
  if (s.includes("offer")) return "status-offer";
  if (s.includes("reject")) return "status-rejected";
  if (s.includes("withdraw")) return "status-withdrawn";
  return "status-default";
}

/** Ordered list of color choices shown in the AdminPage color picker. */
export const STATUS_COLORS = [
  { value: "",                    label: "Auto"   },
  { value: "status-applied",      label: "Blue"   },
  { value: "status-phone-screen", label: "Orange" },
  { value: "status-offer",        label: "Green"  },
  { value: "status-rejected",     label: "Red"    },
  { value: "status-withdrawn",    label: "Grey"   },
];
