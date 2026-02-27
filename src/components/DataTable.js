import { useState, useEffect } from "react";
import { Button, Container, Modal } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import AddJobModal from "./AddJobModal";
import "../DataTable.css";

const COLUMNS = ["Date", "Role", "Company", "Status"];

// Fixed px width for constrained columns; flex for fluid ones
const COL_STYLE = {
  Date:    { width: 100,  flexShrink: 0 },
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
          <Button variant="danger" onClick={() => { deleteRow(confirmRow.id); setConfirmRow(null); }}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <div className="job-cards d-md-none" aria-label="Job applications">
        {rows.map(row => (
          <div key={row.id} className="job-card">
            <div className="job-card-main">
              <div className="job-card-role">{row.Role || "—"}</div>
              <div className="job-card-company text-muted small">{row.Company || ""}</div>
              <div className="job-card-meta text-muted small">
                {[row.Status, row.Date].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="job-card-actions">
              <button className="btn btn-link job-card-btn" aria-label={`View or edit ${row.Role || "job"} at ${row.Company || "unknown company"}`} onClick={() => setViewingRow(row)}>👁</button>
              <button className="btn btn-link job-card-btn" aria-label={`Delete ${row.Role || "job"} at ${row.Company || "unknown company"}`} onClick={() => setConfirmRow(row)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <div className="sheet-scroll d-none d-md-block" role="table" aria-label="Job applications">
        <div role="rowgroup">
          <div className="sheet-grid sheet-header" role="row">
            <div className="sheet-cell" role="columnheader" aria-label="Actions" style={{ width: 56, flexShrink: 0 }}></div>
            {COLUMNS.map(col => (
              <div key={col} className="sheet-cell" role="columnheader" style={COL_STYLE[col]}>
                {col}
              </div>
            ))}
          </div>
        </div>

        <div role="rowgroup">
          {rows.map(row => (
            <div key={row.id} className="sheet-grid" role="row">
              <div className="sheet-cell" role="cell" style={{ width: 56, flexShrink: 0, justifyContent: "center", gap: 6, display: "flex" }}>
                <button
                  className="btn btn-sm btn-link p-0"
                  style={{ fontSize: "15px", opacity: 0.6 }}
                  aria-label={`View or edit ${row.Role || "job"} at ${row.Company || "unknown company"}`}
                  onClick={() => setViewingRow(row)}
                >👁</button>
                <button
                  className="btn btn-sm btn-link p-0"
                  style={{ fontSize: "15px", opacity: 0.6 }}
                  aria-label={`Delete ${row.Role || "job"} at ${row.Company || "unknown company"}`}
                  onClick={() => setConfirmRow(row)}
                >🗑️</button>
              </div>
              {COLUMNS.map(col => (
                <div key={col} className="sheet-cell" role="cell" style={COL_STYLE[col]}>
                  <span style={{ padding: "4px 6px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row[col] ?? ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
