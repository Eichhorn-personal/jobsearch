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
