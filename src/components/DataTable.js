import { useState, useEffect } from "react";
import { Button, Container, Modal } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import AddJobModal from "./AddJobModal";
import "../DataTable.css";

const COLUMNS = ["Date", "Role", "Company", "Status"];

function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("apply") || s.includes("applied")) return "status-applied";
  if (s.includes("phone") || s.includes("screen")) return "status-phone-screen";
  if (s.includes("interview")) return "status-interview";
  if (s.includes("offer")) return "status-offer";
  if (s.includes("reject")) return "status-rejected";
  if (s.includes("withdraw")) return "status-withdrawn";
  return "status-default";
}

// Fixed px width for constrained columns; flex for fluid ones
const COL_STYLE = {
  Date:    { width: 115,  flexShrink: 0 },
  Role:    { flex: 1,     minWidth: 80 },
  Company: { flex: 1,     minWidth: 80 },
  Status:  { width: 130,  flexShrink: 0 },
};

export default function DataTable() {
  const [rows, setRows] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingRow, setViewingRow] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
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

  const toggleSelect = (row) =>
    setSelectedRow(prev => prev?.id === row.id ? null : row);

  return (
    <Container fluid className="p-0">
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn-compose" onClick={() => setShowAddModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Add Job
        </button>
        {selectedRow && (
          <>
            <button
              className="btn-toolbar-action"
              onClick={() => setViewingRow(selectedRow)}
              title="Edit selected record"
            >
              ✏ Edit
            </button>
            <button
              className="btn-toolbar-action btn-toolbar-delete"
              onClick={() => setConfirmRow(selectedRow)}
              title="Delete selected record"
            >
              ✕ Delete
            </button>
          </>
        )}
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

      <Modal show={!!confirmRow} onHide={() => setConfirmRow(null)} centered aria-labelledby="confirm-delete-title">
        <Modal.Header closeButton>
          <Modal.Title id="confirm-delete-title">Delete Record?</Modal.Title>
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
          <Button variant="danger" onClick={() => { deleteRow(confirmRow.id); setConfirmRow(null); setSelectedRow(null); }}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <div className="job-cards d-md-none" aria-label="Job applications">
        {rows.map(row => (
          <div
            key={row.id}
            className={`job-card${selectedRow?.id === row.id ? " job-card--selected" : ""}`}
            onClick={() => toggleSelect(row)}
            role="row"
            aria-selected={selectedRow?.id === row.id}
          >
            <div className="job-card-main">
              <div className="job-card-role">{row.Role || "—"}</div>
              <div className="job-card-company">{row.Company || ""}</div>
              <div className="job-card-meta">
                {[row.Status, row.Date].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sheet-scroll d-none d-md-block" role="table" aria-label="Job applications">
        <div role="rowgroup">
          <div className="sheet-grid sheet-header" role="row">
            {COLUMNS.map(col => (
              <div key={col} className="sheet-cell" role="columnheader" style={COL_STYLE[col]}>
                {col}
              </div>
            ))}
          </div>
        </div>

        <div role="rowgroup">
          {rows.map(row => (
            <div
              key={row.id}
              className={`sheet-grid sheet-row${selectedRow?.id === row.id ? " sheet-grid--selected" : ""}`}
              role="row"
              aria-selected={selectedRow?.id === row.id}
              onClick={() => toggleSelect(row)}
            >
              {COLUMNS.map(col => (
                <div key={col} className="sheet-cell" role="cell" style={COL_STYLE[col]}>
                  {col === "Status" ? (
                    <span className={`status-chip ${statusClass(row[col])}`}>{row[col] ?? ""}</span>
                  ) : (
                    <span style={{ padding: "4px 10px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row[col] ?? ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
