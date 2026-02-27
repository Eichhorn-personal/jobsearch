import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Table, Badge, Spinner } from "react-bootstrap";
import { useApi } from "../hooks/useApi";

const EVENT_VARIANT = {
  USER_CREATED: "primary",
  USER_LOGIN:   "info",
  USER_LOGOUT:  "secondary",
  JOB_CREATED:  "success",
  JOB_UPDATED:  "warning",
  JOB_DELETED:  "danger",
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
    <Container className="mt-4" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-center mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate("/admin")} className="me-3" aria-label="Back to admin">
          ← Back
        </Button>
        <h1 className="mb-0 flex-grow-1 h4">Activity Log</h1>
        <Button variant="outline-secondary" size="sm" onClick={load}>Refresh</Button>
      </div>

      <div aria-live="polite">
        {entries === null ? (
          <div className="text-center mt-5"><Spinner animation="border" /></div>
        ) : entries.length === 0 ? (
          <p className="text-muted">No log entries yet.</p>
        ) : (
          <div className="table-responsive">
          <Table hover size="sm" className="align-middle">
            <caption className="visually-hidden">Activity log entries</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 180 }}>Time</th>
                <th scope="col" style={{ width: 130 }}>Event</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i}>
                  <td className="text-muted small">{formatTimestamp(e.timestamp)}</td>
                  <td className="small">
                    <Badge bg={EVENT_VARIANT[e.event] || "secondary"} text={EVENT_VARIANT[e.event] === "warning" ? "dark" : undefined}>
                      {e.event}
                    </Badge>
                  </td>
                  <td className="small">
                    <EntryDetails data={e.data} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>
        )}
      </div>
    </Container>
  );
}
