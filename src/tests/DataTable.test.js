import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import DataTable from "../components/DataTable";

jest.mock("../hooks/useApi", () => ({ useApi: jest.fn() }));
jest.mock("../components/AddJobModal", () => () => null);

const sampleJobs = [
  { id: 1, Role: "Engineer", Company: "Acme", Date: "01/15/2025", Status: "Applied" },
  { id: 2, Role: "Designer", Company: "Globex", Date: "02/20/2025", Status: "Rejected" },
];

function makeRequest(jobs = sampleJobs) {
  return jest.fn().mockImplementation((path, options = {}) => {
    if (path === "/api/jobs" && !options.method)
      return Promise.resolve({ json: () => Promise.resolve([...jobs]) });
    if (path === "/api/dropdowns")
      return Promise.resolve({ json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderDataTable(jobs = sampleJobs) {
  const mockRequest = makeRequest(jobs);
  useApi.mockReturnValue({ request: mockRequest });
  render(
    <MemoryRouter>
      <AuthProvider>
        <DataTable />
      </AuthProvider>
    </MemoryRouter>
  );
  return { mockRequest };
}

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── ARIA structure ────────────────────────────────────────────────────────────

describe("DataTable — ARIA structure", () => {
  test('renders element with role="table"', async () => {
    renderDataTable();
    // Drain pending state updates from the data-loading effect
    await act(async () => {});
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  test("table has accessible label", async () => {
    renderDataTable();
    await act(async () => {});
    expect(
      screen.getByRole("table", { name: /job applications/i })
    ).toBeInTheDocument();
  });
});

// ── row selection and toolbar ─────────────────────────────────────────────────
// DataTable uses a selection model: clicking a row reveals Edit/Delete toolbar buttons.

describe("DataTable — action buttons", () => {
  test("clicking a row reveals Edit toolbar button", async () => {
    renderDataTable();
    await act(async () => {});
    // rows with aria-selected are data rows (header row has no aria-selected)
    const dataRows = screen
      .getAllByRole("row")
      .filter((r) => r.getAttribute("aria-selected") !== null);
    userEvent.click(dataRows[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
    );
  });

  test("clicking a row reveals Delete toolbar button", async () => {
    renderDataTable();
    await act(async () => {});
    const dataRows = screen
      .getAllByRole("row")
      .filter((r) => r.getAttribute("aria-selected") !== null);
    userEvent.click(dataRows[0]);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete/i })
      ).toBeInTheDocument()
    );
  });
});

// ── delete confirmation modal ─────────────────────────────────────────────────

describe("DataTable — delete confirmation", () => {
  // Helper: load table, select the first row, click the toolbar Delete button
  async function openDeleteModal() {
    renderDataTable();
    await act(async () => {});
    const dataRows = screen
      .getAllByRole("row")
      .filter((r) => r.getAttribute("aria-selected") !== null);
    userEvent.click(dataRows[0]);
    await waitFor(() => screen.getByRole("button", { name: /delete/i }));
    userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => screen.getByRole("dialog"));
  }

  test("clicking delete toolbar button shows confirmation dialog", async () => {
    await openDeleteModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("confirm dialog has aria-labelledby pointing to title", async () => {
    await openDeleteModal();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "confirm-delete-title"
    );
  });

  test("confirming delete removes the row from the table", async () => {
    await openDeleteModal();
    // "Delete" (exact) targets the modal danger button, not the toolbar "✕ Delete"
    userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(
        screen.queryAllByRole("button", { name: /delete/i })
      ).toHaveLength(0)
    );
  });
});
