import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, InputGroup, Button, Modal, Spinner } from "react-bootstrap";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { statusClass, STATUS_COLORS } from "../utils/statusColor";
import "../DataTable.css";

export default function AdminPage() {
  const { request } = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  const [users, setUsers] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const loadUsers = useCallback(() => {
    request("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .catch(console.error);
  }, [request]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId, role) => {
    const res = await request(`/api/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }
  };

  const handleDeleteUser = async (userId) => {
    const res = await request(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setConfirmDeleteUser(null);
  };

  const handleDownload = async () => {
    const res = await request("/api/jobs");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-tracker-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [dropdowns, setDropdowns] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
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

  const setError = (key, msg) => setErrors((prev) => ({ ...prev, [key]: msg }));
  const clearError = (key) => setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });

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
    setDropdowns((prev) => ({ ...prev, [fieldName]: [...(prev[fieldName] || []), created] }));
    setNewValues((prev) => ({ ...prev, [fieldName]: "" }));
  };

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

  const deleteOption = async (id, fieldName) => {
    const res = await request(`/api/dropdowns/option/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setDropdowns((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((o) => o.id !== id),
    }));
  };

  const saveColor = async (optId, color, fieldName) => {
    const res = await request(`/api/dropdowns/option/${optId}`, {
      method: "PUT",
      body: JSON.stringify({ color }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setDropdowns((prev) => ({
      ...prev,
      [fieldName]: prev[fieldName].map((o) => (o.id === optId ? updated : o)),
    }));
  };

  const moveOption = async (fieldName, index, direction) => {
    const options = [...dropdowns[fieldName]];
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    [options[index], options[target]] = [options[target], options[index]];
    setDropdowns((prev) => ({ ...prev, [fieldName]: options }));
    await request(`/api/dropdowns/${encodeURIComponent(fieldName)}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ orderedIds: options.map((o) => o.id) }),
    });
  };

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
    return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;
  }

  return (
    <Container className="pt-3" style={{ maxWidth: 640 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn-toolbar-action" onClick={() => navigate("/")} aria-label="Back to home">
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 400, color: "#5f6368", flexGrow: 1 }}>
          Manage
        </h1>
        <button className="btn-toolbar-action" onClick={() => navigate("/logs")}>View Logs</button>
        <button className="btn-toolbar-action" onClick={handleDownload}>Download Data</button>
      </div>

      {/* Users panel */}
      <div className="sheet-scroll mb-4" role="table" aria-label="Users">
        <div className="admin-panel-header" role="rowgroup">
          <span>Users</span>
        </div>
        {users === null ? (
          <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
        ) : (
          <>
            <div className="sheet-grid sheet-header" role="row">
              <div className="sheet-cell" role="columnheader" style={{ flex: 1, justifyContent: "flex-start" }}>Email</div>
              <div className="sheet-cell" role="columnheader" style={{ width: 155, flexShrink: 0 }}>Role</div>
              <div className="sheet-cell" role="columnheader" style={{ width: 44, flexShrink: 0 }} aria-label="Actions" />
            </div>
            {users.map((u) => (
              <div key={u.id} className="sheet-grid sheet-row" role="row">
                <div className="sheet-cell" role="cell" style={{ flex: 1 }}>
                  <span style={{ padding: "4px 10px", fontSize: 14 }}>{u.username}</span>
                </div>
                <div className="sheet-cell" role="cell" style={{ width: 155, flexShrink: 0, padding: "4px 8px" }}>
                  <Form.Select
                    size="sm"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    aria-label={`Role for ${u.username}`}
                    style={{ fontSize: 13 }}
                  >
                    <option value="contributor">contributor</option>
                    <option value="admin">admin</option>
                  </Form.Select>
                </div>
                <div className="sheet-cell" role="cell" style={{ width: 44, flexShrink: 0, justifyContent: "center" }}>
                  <button
                    className="row-action-btn"
                    onClick={() => setConfirmDeleteUser(u)}
                    aria-label={`Delete user ${u.username}`}
                    title="Delete user"
                  >✕</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Confirm delete user */}
      <Modal show={!!confirmDeleteUser} onHide={() => setConfirmDeleteUser(null)} centered aria-labelledby="confirm-delete-user-title">
        <Modal.Header closeButton>
          <Modal.Title id="confirm-delete-user-title">Delete User?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmDeleteUser && (
            <p className="mb-0">
              Are you sure you want to delete <strong>{confirmDeleteUser.username}</strong>?
              <br />
              <span className="text-muted small">This will also delete all their job records.</span>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDeleteUser(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleDeleteUser(confirmDeleteUser?.id)}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* One panel per dropdown field */}
      {Object.entries(dropdowns).map(([fieldName, options]) => (
        <div key={fieldName} className="admin-panel">
          <div className="admin-panel-header">
            <span>{fieldName}</span>
            <span className="status-chip status-withdrawn" style={{ fontSize: 11 }}>{options.length}</span>
          </div>

          {options.length === 0 && (
            <div className="text-muted small" style={{ padding: "10px 16px" }}>No options yet — add one below.</div>
          )}

          {options.map((opt, idx) => (
            <div key={opt.id} className="admin-option-row">
              {/* Up / down arrows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <button className="arrow-btn" disabled={idx === 0} onClick={() => moveOption(fieldName, idx, -1)} aria-label={`Move ${opt.label} up`}>▲</button>
                <button className="arrow-btn" disabled={idx === options.length - 1} onClick={() => moveOption(fieldName, idx, 1)} aria-label={`Move ${opt.label} down`}>▼</button>
              </div>

              {editingId === opt.id ? (
                <div style={{ flex: 1 }}>
                  <InputGroup size="sm">
                    <Form.Control
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(opt.id, fieldName);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      isInvalid={!!errors[`edit-${opt.id}`]}
                      aria-label={`Edit label for ${opt.label}`}
                      autoFocus
                    />
                    <Button variant="success" size="sm" onClick={() => saveEdit(opt.id, fieldName)}>Save</Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => setEditingId(null)} aria-label="Cancel edit">✕</Button>
                  </InputGroup>
                  {errors[`edit-${opt.id}`] && (
                    <div className="text-danger small mt-1">{errors[`edit-${opt.id}`]}</div>
                  )}
                </div>
              ) : (
                <>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {fieldName === "Status" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span
                        className={`status-chip ${opt.color || statusClass(opt.label)}`}
                        style={{ fontSize: 11, pointerEvents: "none", userSelect: "none" }}
                        aria-hidden="true"
                      >
                        {opt.label}
                      </span>
                      <Form.Select
                        size="sm"
                        value={opt.color || ""}
                        onChange={(e) => saveColor(opt.id, e.target.value, fieldName)}
                        aria-label={`Color for ${opt.label}`}
                        style={{ width: 88, fontSize: 12 }}
                      >
                        {STATUS_COLORS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </Form.Select>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      className="row-action-btn"
                      style={{ opacity: 0.5 }}
                      onClick={() => { setEditingId(opt.id); setEditValue(opt.label); }}
                      aria-label={`Edit option: ${opt.label}`}
                      title="Edit"
                    >✏</button>
                    <button
                      className="row-action-btn"
                      style={{ opacity: 0.5 }}
                      onClick={() => deleteOption(opt.id, fieldName)}
                      aria-label={`Delete option: ${opt.label}`}
                      title="Delete"
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="admin-panel-footer">
            <InputGroup size="sm">
              <Form.Control
                placeholder="New option…"
                value={newValues[fieldName] || ""}
                onChange={(e) => setNewValues((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") addOption(fieldName); }}
                isInvalid={!!errors[`add-${fieldName}`]}
                aria-label={`New option for ${fieldName}`}
              />
              <Button variant="primary" size="sm" onClick={() => addOption(fieldName)}>Add</Button>
            </InputGroup>
            {errors[`add-${fieldName}`] && (
              <div className="text-danger small mt-1" role="alert">{errors[`add-${fieldName}`]}</div>
            )}
          </div>
        </div>
      ))}

      {/* Add new dropdown field */}
      <div className="admin-panel">
        <div className="admin-panel-header">Add New Dropdown Field</div>
        <div className="admin-panel-footer">
          <InputGroup size="sm">
            <Form.Control
              placeholder="Field name (e.g. Priority, Job Type…)"
              value={newFieldName}
              onChange={(e) => { setNewFieldName(e.target.value); clearError("newField"); }}
              onKeyDown={(e) => { if (e.key === "Enter") addField(); }}
              isInvalid={!!errors.newField}
              aria-label="New dropdown field name"
            />
            <Button variant="outline-primary" size="sm" onClick={addField}>Create</Button>
          </InputGroup>
          {errors.newField && (
            <div className="text-danger small mt-1" role="alert">{errors.newField}</div>
          )}
          <div className="text-muted small mt-1">The field will appear in the table once you add its first option.</div>
        </div>
      </div>

    </Container>
  );
}
