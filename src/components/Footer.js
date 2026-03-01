import { useTheme } from "../context/ThemeContext";

export default function Footer() {
  const { theme } = useTheme();
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
      <div className="container d-flex align-items-center">
        <span style={{ fontSize: 12, color: "#5f6368" }}>
          © {new Date().getFullYear()} JobTracker
        </span>
      </div>
    </footer>
  );
}
