import { useTheme } from "../context/ThemeContext";

export default function Footer() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className="border-top py-2 bg-body" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      <div className="container d-flex justify-content-between align-items-center">
        <span className="text-muted small">© {new Date().getFullYear()} JobTracker</span>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️  Light" : "🌙  Dark"}
        </button>
      </div>
    </footer>
  );
}
