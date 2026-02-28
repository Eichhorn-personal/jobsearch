import { useState } from "react";
import { Modal, Button, Form, Row, Col, Spinner } from "react-bootstrap";
import { formatDate, cleanJobUrl } from "../utils/dateFormat";
import { useApi } from "../hooks/useApi";

const today = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

const emptyForm = () => ({
  Date: today(),
  Role: "",
  Company: "",
  "Source Link": "",
  "Company Link": "",
  Resume: false,
  "Cover Letter": false,
  Status: "Applied",
  Recruiter: "",
  "Hiring Mgr": "",
  Panel: "",
  HR: "",
  Comments: "",
});

// Rendered with a `key` prop by the parent so it remounts fresh for each row.
export default function AddJobModal({ show, onHide, onAdd, onSave, initialData, dropdownOptions }) {
  const isEditing = !!initialData;

  const [form, setForm] = useState(() =>
    initialData ? { ...initialData } : emptyForm()
  );
  const [dateError, setDateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeNote, setScrapeNote] = useState(null); // "ok" | "empty" | null
  const { request } = useApi();

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleUrlPaste = (field) => async (e) => {
    const pasted = e.clipboardData.getData("text");
    const cleaned = cleanJobUrl(pasted);
    if (cleaned !== pasted) {
      e.preventDefault();
      set(field, cleaned);
    }

    // Auto-populate Role & Company from the job posting page
    if (field === "Source Link") {
      const url = cleaned !== pasted ? cleaned : pasted;
      setScraping(true);
      setScrapeNote(null);
      try {
        const res = await request(`/api/scrape?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const { role, company } = await res.json();
          setForm(prev => ({
            ...prev,
            ...(role    && !prev.Role    ? { Role:    role    } : {}),
            ...(company && !prev.Company ? { Company: company } : {}),
          }));
          setScrapeNote(role || company ? "ok" : "empty");
        } else {
          setScrapeNote("empty");
        }
      } catch (err) {
        console.error("[scrape] request failed:", err);
        setScrapeNote("empty");
      } finally {
        setScraping(false);
      }
    }
  };

  const handleDateBlur = () => {
    if (!form.Date) { setDateError(false); return; }
    const formatted = formatDate(form.Date);
    if (formatted === null) {
      setDateError(true);
    } else {
      setDateError(false);
      set("Date", formatted);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dateError) return;

    let committed = form;
    if (form.Date) {
      const formatted = formatDate(form.Date);
      if (formatted === null) { setDateError(true); return; }
      committed = { ...form, Date: formatted };
    }

    setSubmitting(true);
    if (isEditing) {
      await onSave(committed);
    } else {
      await onAdd(committed);
      setForm(emptyForm());
      setDateError(false);
    }
    setSubmitting(false);
    onHide();
  };

  const handleHide = () => {
    if (!isEditing) {
      setForm(emptyForm());
      setDateError(false);
    }
    onHide();
  };

  const statusOptions = dropdownOptions["Status"] || [];
  const formStatus = form.Status || statusOptions[0] || "";

  return (
    <Modal show={show} onHide={handleHide} size="lg" aria-labelledby="add-job-modal-title" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title id="add-job-modal-title">{isEditing ? "Edit Job" : "Add Job"}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="mb-3">
            <Col sm={4}>
              <Form.Group>
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="mm/dd/yyyy"
                  value={form.Date}
                  onChange={e => { set("Date", e.target.value); setDateError(false); }}
                  onBlur={handleDateBlur}
                  isInvalid={dateError}
                  aria-describedby={dateError ? "date-error" : undefined}
                  autoFocus
                />
                {dateError && (
                  <Form.Control.Feedback type="invalid" id="date-error">
                    Enter a date like 2/3, 2/3/25, or 02/03/2025
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
            <Col sm={8}>
              <Form.Group>
                <Form.Label>Role</Form.Label>
                <Form.Control
                  type="text"
                  value={form.Role}
                  onChange={e => set("Role", e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col sm={8}>
              <Form.Group>
                <Form.Label>Company</Form.Label>
                <Form.Control
                  type="text"
                  value={form.Company}
                  onChange={e => set("Company", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={formStatus}
                  onChange={e => set("Status", e.target.value)}
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="d-flex align-items-center gap-2">
                  Source Link
                  {scraping && <Spinner animation="border" size="sm" aria-label="Fetching job details" />}
                </Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://"
                  value={form["Source Link"]}
                  onChange={e => { set("Source Link", e.target.value); setScrapeNote(null); }}
                  onPaste={handleUrlPaste("Source Link")}
                />
                {scrapeNote === "ok" && (
                  <div className="text-success small mt-1">✓ Role and company detected</div>
                )}
                {scrapeNote === "empty" && (
                  <div className="text-muted small mt-1">Could not detect job details — please fill in manually</div>
                )}
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label>Company Link</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://"
                  value={form["Company Link"]}
                  onChange={e => set("Company Link", e.target.value)}
                  onPaste={handleUrlPaste("Company Link")}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col sm={3}>
              <Form.Group>
                <Form.Label>Recruiter</Form.Label>
                <Form.Control
                  type="text"
                  value={form.Recruiter}
                  onChange={e => set("Recruiter", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={3}>
              <Form.Group>
                <Form.Label>Hiring Mgr</Form.Label>
                <Form.Control
                  type="text"
                  value={form["Hiring Mgr"]}
                  onChange={e => set("Hiring Mgr", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={3}>
              <Form.Group>
                <Form.Label>Panel</Form.Label>
                <Form.Control
                  type="text"
                  value={form.Panel}
                  onChange={e => set("Panel", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={3}>
              <Form.Group>
                <Form.Label>HR</Form.Label>
                <Form.Control
                  type="text"
                  value={form.HR}
                  onChange={e => set("HR", e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="d-block">Resume</Form.Label>
                <Form.Check
                  type="checkbox"
                  label="Sent resume"
                  checked={form.Resume}
                  onChange={e => set("Resume", e.target.checked)}
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="d-block">Cover Letter</Form.Label>
                <Form.Check
                  type="checkbox"
                  label="Sent cover letter"
                  checked={form["Cover Letter"]}
                  onChange={e => set("Cover Letter", e.target.checked)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group>
            <Form.Label>Comments</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.Comments}
              onChange={e => set("Comments", e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleHide} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || dateError}>
            {submitting ? "Saving…" : isEditing ? "Save Changes" : "Add Job"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
