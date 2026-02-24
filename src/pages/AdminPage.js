import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Card, Button, Form, InputGroup, Badge, Spinner,
} from "react-bootstrap";
import { useApi } from "../hooks/useApi";

export default function AdminPage() {
  const { request } = useApi();
  const navigate = useNavigate();

  // { "Status": [{ id, label, sort_order }, ...], ... }
  const [dropdowns, setDropdowns] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  // per-field "new option" input values
  const [newValues, setNewValues] = useState({});
  const [newFieldName, setNewFieldName] = useState("");
  const [errors, setErrors] = useState({});

  const loadDropdowns = useCallback(() => {
    request("/api/dropdowns")
      .then((res) => res.json())
      .then(setDropdowns)
      .catch(console.error);
  }, [request]);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  const setError = (key, msg) =>
    setErrors((prev) => ({ ...prev, [key]: msg }));
  const clearError = (key) =>
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });

  // ── Add option ───────────────────────────────────────────────
  const addOption = async (fieldName) => {
    const label = (newValues[fieldName] || "").trim();
    if (!label) return;
    clearError(`add-${fieldName}`);

    const res = await request(`/api/dropdowns/${encodeURIComponent(fieldName)}`, {
      method: "POST",
      body: JSON.stringify({ label }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(`add-${fieldName}`, d.error || "Failed to add option");
      return;
    }
    const created = await res.json();
    setDropdowns((prev) => ({
      ...prev,
      [fieldName]: [...(prev[fieldName] || []), created],
    }));
    setNewValues((prev) => ({ ...prev, [fieldName]: "" }));
  };

  // ── Save inline edit ─────────────────────────────────────────
  const saveEdit = async (id, fieldName) => {
    const label = editValue.trim();
    if (!label) return;
    clearError(`edit-${id}`);

    const res = await request(`/api/dropdowns/option/${id}`, {
      method: "PUT",
      body: JSON.stringify({ label }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(`edit-${id}`, d.error || "Failed to save");
      return;
    }
    const updated = await res.json();
    setDropdowns((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].map((o) => (o.id === id ? updated : o)),
    }));
    setEditingId(null);
  };

  // ── Delete option ─────────────────────────────────────────────
  const deleteOption = async (id, fieldName) => {
    const res = await request(`/api/dropdowns/option/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setDropdowns((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((o) => o.id !== id),
    }));
  };

  // ── Reorder (swap adjacent) ───────────────────────────────────
  const moveOption = async (fieldName, index, direction) => {
    const options = [...dropdowns[fieldName]];
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    [options[index], options[target]] = [options[target], options[index]];

    // Optimistic update
    setDropdowns((prev) => ({ ...prev, [fieldName]: options }));

    await request(`/api/dropdowns/${encodeURIComponent(fieldName)}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ orderedIds: options.map((o) => o.id) }),
    });
  };

  // ── Add new dropdown field (client-side; persists when first option is added) ──
  const addField = () => {
    const name = newFieldName.trim();
    if (!name) return;
    if (dropdowns[name] !== undefined) {
      setError("newField", "A field with that name already exists");
      return;
    }
    clearError("newField");
    setDropdowns((prev) => ({ ...prev, [name]: [] }));
    setNewFieldName("");
  };

  if (dropdowns === null) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4" style={{ maxWidth: 620 }}>

      {/* Header row */}
      <div className="d-flex align-items-center mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate("/")}
          className="me-3"
        >
          ← Back
        </Button>
        <h4 className="mb-0 flex-grow-1">Manage Dropdown Options</h4>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate("/logs")}
          className="me-2"
        >
          View Logs
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={async () => {
            const res = await request("/api/jobs");
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "job-tracker-data.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download Data
        </Button>
      </div>

      {/* One card per field */}
      {Object.entries(dropdowns).map(([fieldName, options]) => (
        <Card key={fieldName} className="mb-3 shadow-sm">
          <Card.Header className="d-flex align-items-center justify-content-between fw-semibold">
            {fieldName}
            <Badge bg="secondary" pill>{options.length}</Badge>
          </Card.Header>

          <Card.Body className="p-0">
            {options.length === 0 && (
              <p className="text-muted small px-3 pt-3 mb-0">No options yet — add one below.</p>
            )}

            {options.map((opt, idx) => (
              <div
                key={opt.id}
                className="d-flex align-items-center px-3 py-2 border-bottom"
              >
                {/* Up / Down arrows */}
                <div className="d-flex flex-column me-2" style={{ gap: 1, minWidth: 18 }}>
                  <button
                    className="btn btn-link btn-sm p-0 lh-1 text-muted"
                    style={{ fontSize: 11 }}
                    disabled={idx === 0}
                    onClick={() => moveOption(fieldName, idx, -1)}
                    title="Move up"
                  >▲</button>
                  <button
                    className="btn btn-link btn-sm p-0 lh-1 text-muted"
                    style={{ fontSize: 11 }}
                    disabled={idx === options.length - 1}
                    onClick={() => moveOption(fieldName, idx, 1)}
                    title="Move down"
                  >▼</button>
                </div>

                {/* Label / inline editor */}
                {editingId === opt.id ? (
                  <div className="flex-grow-1">
                    <InputGroup size="sm">
                      <Form.Control
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(opt.id, fieldName);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        isInvalid={!!errors[`edit-${opt.id}`]}
                        autoFocus
                      />
                      <Button variant="success" size="sm" onClick={() => saveEdit(opt.id, fieldName)}>
                        Save
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setEditingId(null)}>
                        ✕
                      </Button>
                    </InputGroup>
                    {errors[`edit-${opt.id}`] && (
                      <div className="text-danger small mt-1">{errors[`edit-${opt.id}`]}</div>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="flex-grow-1">{opt.label}</span>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        title="Edit"
                        onClick={() => { setEditingId(opt.id); setEditValue(opt.label); }}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        title="Delete"
                        onClick={() => deleteOption(opt.id, fieldName)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add option row */}
            <div className="p-3">
              <InputGroup size="sm">
                <Form.Control
                  placeholder="New option…"
                  value={newValues[fieldName] || ""}
                  onChange={(e) =>
                    setNewValues((prev) => ({ ...prev, [fieldName]: e.target.value }))
                  }
                  onKeyDown={(e) => { if (e.key === "Enter") addOption(fieldName); }}
                  isInvalid={!!errors[`add-${fieldName}`]}
                />
                <Button variant="primary" size="sm" onClick={() => addOption(fieldName)}>
                  Add
                </Button>
              </InputGroup>
              {errors[`add-${fieldName}`] && (
                <div className="text-danger small mt-1">{errors[`add-${fieldName}`]}</div>
              )}
            </div>
          </Card.Body>
        </Card>
      ))}

      {/* Add new dropdown field */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Subtitle className="mb-2 text-muted small">Add a new dropdown field</Card.Subtitle>
          <InputGroup size="sm">
            <Form.Control
              placeholder="Field name (e.g. Priority, Job Type…)"
              value={newFieldName}
              onChange={(e) => { setNewFieldName(e.target.value); clearError("newField"); }}
              onKeyDown={(e) => { if (e.key === "Enter") addField(); }}
              isInvalid={!!errors.newField}
            />
            <Button variant="outline-primary" size="sm" onClick={addField}>
              Create
            </Button>
          </InputGroup>
          {errors.newField && (
            <div className="text-danger small mt-1">{errors.newField}</div>
          )}
          <div className="text-muted small mt-1">
            The field will appear in the table once you add its first option.
          </div>
        </Card.Body>
      </Card>

    </Container>
  );
}
