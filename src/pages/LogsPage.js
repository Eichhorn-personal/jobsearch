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

function EntryDetails({ event, data }) {
  if (event === "USER_CREATED") {
    return <>{data.email} &nbsp;<span className="text-muted small">id={data.id} source={data.source}</span></>;
  }
  if (event === "USER_LOGIN") {
    return <>{data.email} &nbsp;<span className="text-muted small">source={data.source}</span></>;
  }
  if (event === "USER_LOGOUT") {
    return <>{data.email}</>;
  }
  const parts = [];
  if (data.role)    parts.push(data.role);
  if (data.company) parts.push(data.company);
  return (
    <>
      {parts.join(" · ")}
      &nbsp;<span className="text-muted small">job_id={data.id} email={data.email}</span>
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
                <td>
                  <Badge bg={EVENT_VARIANT[e.event] || "secondary"}>
                    {e.event}
                  </Badge>
                </td>
                <td className="small">
                  <EntryDetails event={e.event} data={e.data} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
