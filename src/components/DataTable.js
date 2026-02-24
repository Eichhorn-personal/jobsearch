import { useState, useEffect, useRef } from "react";
import { Button, Container, Modal } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import AddJobModal from "./AddJobModal";
import "../DataTable.css";

const COLUMNS = ["Date", "Role", "Company", "Status"];

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingRow, setViewingRow] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const gridRef = useRef(null);
  const { request } = useApi();

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

  const handleAddJob = async (formData) => {
    try {
      const res = await request("/api/jobs", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const created = await res.json();
      setRows(prev => [...prev, created]);
    } catch (err) {
      console.error("Failed to add job:", err);
    }
  };

  const handleSaveJob = async (formData) => {
    const id = viewingRow.id;
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...formData } : r));
    try {
      await request(`/api/jobs/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.error("Failed to save job:", err);
    }
  };

  const deleteRow = async (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
    try {
      await request(`/api/jobs/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete row:", err);
    }
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


  return (
    <Container fluid className="p-0">
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <Button onClick={() => setShowAddModal(true)}>Add Job</Button>
      </div>

      <AddJobModal
        key={viewingRow ? viewingRow.id : "new"}
        show={showAddModal || !!viewingRow}
        onHide={() => { setShowAddModal(false); setViewingRow(null); }}
        onAdd={handleAddJob}
        onSave={handleSaveJob}
        initialData={viewingRow}
        dropdownOptions={dropdownOptions}
      />

      <Modal show={!!confirmRow} onHide={() => setConfirmRow(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Record?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmRow && (
            <p className="mb-0">
              Are you sure you want to delete this record?
              <br />
              <span className="text-muted small">
                {[confirmRow.Date, confirmRow.Role, confirmRow.Company].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmRow(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { deleteRow(confirmRow.id); setConfirmRow(null); }}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <div className="sheet-scroll" ref={gridRef}>
        <div className="sheet-grid sheet-header">
          <div className="sheet-cell" style={{ width: 64 }}></div>
          {COLUMNS.map(col => (
            <div key={col} className="sheet-cell" style={{ width: colWidths[col] || 150 }}>
              {col}
              <div className="col-resizer" onMouseDown={e => startResize(col, e)} />
            </div>
          ))}
        </div>

        {rows.map(row => (
          <div key={row.id} className="sheet-grid">
            <div className="sheet-cell" style={{ width: 64, justifyContent: "center", gap: 6, display: "flex" }}>
              <span
                style={{ cursor: "pointer", fontSize: "15px", userSelect: "none", opacity: 0.6 }}
                title="View / edit"
                onClick={() => setViewingRow(row)}
              >👁</span>
              <span
                style={{ cursor: "pointer", fontSize: "15px", userSelect: "none", opacity: 0.6 }}
                title="Delete"
                onClick={() => setConfirmRow(row)}
              >🗑️</span>
            </div>
            {COLUMNS.map(col => (
              <div
                key={col}
                className="sheet-cell"
                style={{ width: colWidths[col] || 150 }}
              >
                <span style={{ padding: "4px 6px" }}>{row[col] ?? ""}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Container>
  );
}
