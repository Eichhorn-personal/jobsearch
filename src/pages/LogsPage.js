import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import "../DataTable.css";

// Maps event type to the same chip-class system used for job statuses
const EVENT_CHIP = {
  USER_CREATED: "event-primary",
  USER_LOGIN:   "event-info",
  USER_LOGOUT:  "event-secondary",
  JOB_CREATED:  "event-success",
  JOB_UPDATED:  "event-warning",
  JOB_DELETED:  "event-danger",
};

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString();
}

function EntryDetails({ data }) {
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
      {Object.entries(data)
        .filter(([k]) => k !== "id")
        .map(([k, v]) => (
          <span key={k}>{k}={String(v)}</span>
        ))}
    </span>
  );
}

export default function LogsPage() {
  const { request } = useApi();
  const navigate = useNavigate();
  const [entries, setEntries] = useState(null);

  const load = useCallback(() => {
    request("/api/logs")
      .then(res => res.json())
      .then(setEntries)
      .catch(console.error);
  }, [request]);

  useEffect(() => { load(); }, [load]);

  return (
    <Container className="pt-3" style={{ maxWidth: 900 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button className="btn-toolbar-action" onClick={() => navigate("/admin")} aria-label="Back to admin">
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 400, color: "#5f6368", flexGrow: 1 }}>
          Activity Log
        </h1>
        <button className="btn-toolbar-action" onClick={load}>
          Refresh
        </button>
      </div>

      {/* Content */}
      <div aria-live="polite">
        {entries === null ? (
          <div className="text-center mt-5"><Spinner animation="border" /></div>
        ) : entries.length === 0 ? (
          <p className="text-muted">No log entries yet.</p>
        ) : (
          <div className="sheet-scroll" role="table" aria-label="Activity log entries">

            {/* Header */}
            <div className="sheet-grid sheet-header" role="row">
              <div className="sheet-cell" role="columnheader" style={{ width: 190, flexShrink: 0 }}>Time</div>
              <div className="sheet-cell" role="columnheader" style={{ width: 140, flexShrink: 0 }}>Event</div>
              <div className="sheet-cell" role="columnheader" style={{ flex: 1, minWidth: 100 }}>Details</div>
            </div>

            {/* Rows */}
            {entries.map((e, i) => (
              <div key={i} className="sheet-grid" role="row">
                <div className="sheet-cell" role="cell" style={{ width: 190, flexShrink: 0 }}>
                  <span style={{ padding: "4px 10px", fontSize: 13, color: "#5f6368" }}>
                    {formatTimestamp(e.timestamp)}
                  </span>
                </div>
                <div className="sheet-cell" role="cell" style={{ width: 140, flexShrink: 0 }}>
                  <span className={`status-chip ${EVENT_CHIP[e.event] || "event-secondary"}`}>
                    {e.event}
                  </span>
                </div>
                <div className="sheet-cell" role="cell" style={{ flex: 1, minWidth: 100, fontSize: 13 }}>
                  <span style={{ padding: "4px 10px", overflow: "hidden" }}>
                    <EntryDetails data={e.data} />
                  </span>
                </div>
              </div>
            ))}

          </div>
        )}
      </div>
    </Container>
  );
}
