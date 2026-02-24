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
    <>
      {Object.entries(data)
        .filter(([k]) => k !== "id")
        .map(([k, v]) => (
          <span key={k} className="me-3">{k}={String(v)}</span>
        ))}
    </>
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
        <Button variant="outline-secondary" size="sm" onClick={() => navigate("/admin")} className="me-3">
          ← Back
        </Button>
        <h4 className="mb-0 flex-grow-1">Activity Log</h4>
        <Button variant="outline-secondary" size="sm" onClick={load}>Refresh</Button>
      </div>

      {entries === null ? (
        <div className="text-center mt-5"><Spinner animation="border" /></div>
      ) : entries.length === 0 ? (
        <p className="text-muted">No log entries yet.</p>
      ) : (
        <Table hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Time</th>
              <th style={{ width: 130 }}>Event</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i}>
                <td className="text-muted small">{formatTimestamp(e.timestamp)}</td>
                <td className="small">
                  <Badge bg={EVENT_VARIANT[e.event] || "secondary"}>
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
      )}
    </Container>
  );
}
