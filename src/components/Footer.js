import { useTheme } from "../context/ThemeContext";

export default function Footer() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 48,
        background: isDark ? "#202124" : "#ffffff",
        borderTop: `1px solid ${isDark ? "#3c4043" : "#e8eaed"}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
      }}
    >
      <div className="container d-flex justify-content-between align-items-center">
        <span style={{ fontSize: 12, color: "#5f6368" }}>
          © {new Date().getFullYear()} JobTracker
        </span>
        <button
          style={{
            fontSize: 12,
            color: "#5f6368",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 4,
          }}
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀ Light" : "🌙 Dark"}
        </button>
      </div>
    </footer>
  );
}
