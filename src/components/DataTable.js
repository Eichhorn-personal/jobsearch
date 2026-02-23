import { useState, useEffect, useRef } from "react";
import { Button, Container } from "react-bootstrap";
import "../DataTable.css";

export default function DataTable() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [colWidths, setColWidths] = useState({});
  const [dateErrors, setDateErrors] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const gridRef = useRef(null);

  const newRowFocusRef = useRef(null);

  // Fields that behave as hyperlinks
  const linkFields = ["Source Link", "Company Link"];

  // Fields that behave as checkboxes
  const checkboxFields = ["Resume", "Cover Letter"];

  // Fields that behave as dropdowns
  const dropdownFields = ["Status"];

  // Dropdown options (later editable by admin UI)
  const statusOptions = ["Applied", "Interviewing", "Offer", "Rejected", "Ghosted"];

  // SMART DATE PARSER — formats ONLY when complete or on blur
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

  // Load JSON only when needed, never overwrite user data
  useEffect(() => {
    const storedWidths = localStorage.getItem("sheetColWidths");
    if (storedWidths) setColWidths(JSON.parse(storedWidths));

    fetch("/data/initialData.json")
      .then(res => res.json())
      .then(jsonData => {
        jsonData = jsonData.map(row => ({
          ...row,
          Date: formatDate(row.Date) || row.Date
        }));

        const jsonCols = Object.keys(jsonData[0]).filter(k => k !== "id");
        const stored = localStorage.getItem("sheetData");

        if (!stored) {
          setColumns(jsonCols);
          setRows(jsonData);
          localStorage.setItem("sheetData", JSON.stringify(jsonData));
          return;
        }

        const storedData = JSON.parse(stored);
        const storedCols = Object.keys(storedData[0]).filter(k => k !== "id");

        const schemaChanged =
          JSON.stringify(jsonCols) !== JSON.stringify(storedCols);

        if (schemaChanged) {
          setColumns(jsonCols);
          setRows(jsonData);
          localStorage.setItem("sheetData", JSON.stringify(jsonData));
          return;
        }

        setColumns(storedCols);
        setRows(storedData);
      });
  }, []);

  const saveImmediately = (newRows) => {
    localStorage.setItem("sheetData", JSON.stringify(newRows));
  };

  const updateCell = (id, field, value) => {
    const updated = rows.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    );
    setRows(updated);
    saveImmediately(updated);
  };

  const handleDateBlur = (id, value) => {
    const formatted = formatDate(value);

    const updated = rows.map(r => {
      if (r.id !== id) return r;

      if (formatted === null) {
        setDateErrors(prev => ({ ...prev, [id]: true }));
        return { ...r, Date: value };
      }

      setDateErrors(prev => ({ ...prev, [id]: false }));
      return { ...r, Date: formatted };
    });

    setRows(updated);
    saveImmediately(updated);
  };

  const addRow = () => {
    const newId = Date.now();
    const newRow = { id: newId };

    columns.forEach(col => {
      if (checkboxFields.includes(col)) newRow[col] = false;
      else if (dropdownFields.includes(col)) newRow[col] = statusOptions[0];
      else newRow[col] = "";
    });

    newRowFocusRef.current = newId;

    const updated = [...rows, newRow];
    setRows(updated);
    saveImmediately(updated);
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

  const deleteRow = id => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    saveImmediately(updated);
  };

  // NEW: Download data as JSON
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

  // Render a cell (checkbox, dropdown, hyperlink, or text)
  const renderCell = (row, col) => {
    const value = row[col];
    const isLink = linkFields.includes(col);
    const isCheckbox = checkboxFields.includes(col);
    const isDropdown = dropdownFields.includes(col);
    const isEditing = editingCell?.row === row.id && editingCell?.col === col;

    // CHECKBOX FIELD — centered
    if (isCheckbox) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%"
          }}
        >
          <input
            type="checkbox"
            checked={!!value}
            onChange={() => updateCell(row.id, col, !value)}
          />
        </div>
      );
    }

    // DROPDOWN FIELD
    if (isDropdown) {
      return (
        <select
          className="sheet-input"
          value={value}
          onChange={(e) => updateCell(row.id, col, e.target.value)}
          style={{ padding: "4px", width: "100%" }}
        >
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // HYPERLINK FIELD
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

    // NORMAL TEXT FIELD
    return (
      <input
        className="sheet-input"
        data-row={row.id}
        data-field={col}
        value={value}
        onChange={e => updateCell(row.id, col, e.target.value)}
        onBlur={col === "Date"
          ? e => handleDateBlur(row.id, e.target.value)
          : () => setEditingCell(null)}
        onDoubleClick={() => setEditingCell({ row: row.id, col })}
        style={{
          border: col === "Date" && dateErrors[row.id] ? "2px solid red" : "none",
          background: col === "Date" && dateErrors[row.id] ? "#ffe3e3" : "transparent"
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
          {columns.map(col => (
            <div
              key={col}
              className="sheet-cell"
              style={{ width: colWidths[col] || 150 }}
            >
              {col}
              <div
                className="col-resizer"
                onMouseDown={e => startResize(col, e)}
              />
            </div>
          ))}
          <div className="sheet-cell" style={{ width: 100 }}></div>
        </div>

        {rows.map(row => (
          <div key={row.id} className="sheet-grid">
            {columns.map(col => (
              <div
                key={col}
                className="sheet-cell"
                style={{
                  width: colWidths[col] || 150,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                }}
                onClick={() => setEditingCell({ row: row.id, col })}
              >
                {renderCell(row, col)}
              </div>
            ))}

            <div className="sheet-cell" style={{ width: 100, textAlign: "center" }}>
              <span
                style={{
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#b00",
                  userSelect: "none"
                }}
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