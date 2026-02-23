import { useState, useEffect, useRef } from "react";
import { Button, Container } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import "../DataTable.css";

const COLUMNS = [
  "Date", "Role", "Company", "Source Link", "Company Link",
  "Resume", "Cover Letter", "Status",
  "Recruiter", "Hiring Mgr", "Panel", "HR", "Comments",
];

const linkFields = ["Source Link", "Company Link"];
const checkboxFields = ["Resume", "Cover Letter"];
const dropdownFields = ["Status"];

export default function DataTable() {
  const [rows, setRows] = useState([]);
  const [colWidths, setColWidths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sheetColWidths")) || {};
    } catch {
      return {};
    }
  });
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [dateErrors, setDateErrors] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const gridRef = useRef(null);
  const newRowFocusRef = useRef(null);
  const { request } = useApi();

  // SMART DATE PARSER
  const formatDate = (value) => {
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
  };

  // Load rows + dropdown options from API on mount — independently so one failure can't blank the other
  useEffect(() => {
    request("/api/jobs")
      .then(res => res.json())
      .then(data => setRows(data))
      .catch(err => console.error("Failed to load jobs:", err));

    request("/api/dropdowns")
      .then(res => res.json())
      .then(optionsData => {
        const labels = {};
        for (const [field, opts] of Object.entries(optionsData)) {
          labels[field] = opts.map(o => o.label);
        }
        setDropdownOptions(labels);
      })
      .catch(err => console.error("Failed to load dropdown options:", err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCell = async (id, field, value) => {
    // Optimistic update
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    try {
      await request(`/api/jobs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error("Failed to update cell:", err);
    }
  };

  const handleDateBlur = async (id, value) => {
    const formatted = formatDate(value);
    if (formatted === null) {
      setDateErrors(prev => ({ ...prev, [id]: true }));
      setRows(prev => prev.map(r => r.id === id ? { ...r, Date: value } : r));
      return;
    }
    setDateErrors(prev => ({ ...prev, [id]: false }));
    await updateCell(id, "Date", formatted);
  };

  const addRow = async () => {
    const newRow = {};
    COLUMNS.forEach(col => {
      if (checkboxFields.includes(col)) newRow[col] = false;
      else if (dropdownFields.includes(col)) newRow[col] = (dropdownOptions[col] || [])[0] ?? "";
      else newRow[col] = "";
    });

    try {
      const res = await request("/api/jobs", {
        method: "POST",
        body: JSON.stringify(newRow),
      });
      const created = await res.json();
      newRowFocusRef.current = created.id;
      setRows(prev => [...prev, created]);
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  };

  useEffect(() => {
    if (newRowFocusRef.current !== null) {
      const id = newRowFocusRef.current;
      const input = document.querySelector(
        `input[data-row="${id}"][data-field="Date"]`
      );
      if (input) input.focus();
      newRowFocusRef.current = null;
    }
  }, [rows]);

  const deleteRow = async (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
    try {
      await request(`/api/jobs/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete row:", err);
    }
  };

  const downloadData = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-tracker-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const startResize = (col, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[col] || 150;

    const onMouseMove = moveEvent => {
      const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
      const updated = { ...colWidths, [col]: newWidth };
      setColWidths(updated);
      localStorage.setItem("sheetColWidths", JSON.stringify(updated));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const renderCell = (row, col) => {
    const value = row[col];
    const isLink = linkFields.includes(col);
    const isCheckbox = checkboxFields.includes(col);
    const isDropdown = dropdownFields.includes(col);
    const isEditing = editingCell?.row === row.id && editingCell?.col === col;

    if (isCheckbox) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%" }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={() => updateCell(row.id, col, !value)}
          />
        </div>
      );
    }

    if (isDropdown) {
      return (
        <select
          className="sheet-input"
          value={value}
          onChange={(e) => updateCell(row.id, col, e.target.value)}
          style={{ padding: "4px", width: "100%" }}
        >
          {(dropdownOptions[col] || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (isLink && !isEditing && value && value.startsWith("http")) {
      return (
        <div className="sheet-link">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setEditingCell({ row: row.id, col })}
          >
            link
          </a>
        </div>
      );
    }

    return (
      <input
        className="sheet-input"
        data-row={row.id}
        data-field={col}
        value={value ?? ""}
        onChange={e => updateCell(row.id, col, e.target.value)}
        onBlur={col === "Date"
          ? e => handleDateBlur(row.id, e.target.value)
          : () => setEditingCell(null)}
        onDoubleClick={() => setEditingCell({ row: row.id, col })}
        style={{
          border: col === "Date" && dateErrors[row.id] ? "2px solid red" : "none",
          background: col === "Date" && dateErrors[row.id] ? "#ffe3e3" : "transparent",
        }}
      />
    );
  };

  return (
    <Container fluid className="p-0">
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <Button onClick={addRow}>Add Row</Button>
        <Button variant="secondary" onClick={downloadData}>Download Data</Button>
      </div>

      <div className="sheet-scroll" ref={gridRef}>
        <div className="sheet-grid sheet-header">
          {COLUMNS.map(col => (
            <div key={col} className="sheet-cell" style={{ width: colWidths[col] || 150 }}>
              {col}
              <div className="col-resizer" onMouseDown={e => startResize(col, e)} />
            </div>
          ))}
          <div className="sheet-cell" style={{ width: 100 }}></div>
        </div>

        {rows.map(row => (
          <div key={row.id} className="sheet-grid">
            {COLUMNS.map(col => (
              <div
                key={col}
                className="sheet-cell"
                style={{ width: colWidths[col] || 150, display: "flex", justifyContent: "center", alignItems: "center" }}
                onClick={() => setEditingCell({ row: row.id, col })}
              >
                {renderCell(row, col)}
              </div>
            ))}
            <div className="sheet-cell" style={{ width: 100, textAlign: "center" }}>
              <span
                style={{ cursor: "pointer", fontSize: "18px", color: "#b00", userSelect: "none" }}
                onClick={() => deleteRow(row.id)}
                title="Delete row"
              >
                🗑️
              </span>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
