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

// ── row action buttons ────────────────────────────────────────────────────────

describe("DataTable — action buttons", () => {
  test("eye button has accessible label including role and company", async () => {
    renderDataTable();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /view or edit engineer at acme/i })[0]
      ).toBeInTheDocument();
    });
  });

  test("delete icon button has accessible label including role and company", async () => {
    renderDataTable();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
      ).toBeInTheDocument();
    });
  });
});

// ── delete confirmation modal ─────────────────────────────────────────────────

describe("DataTable — delete confirmation", () => {
  test("clicking delete icon shows confirmation dialog", async () => {
    renderDataTable();
    await waitFor(() =>
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    userEvent.click(
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    );
  });

  test("confirm dialog has aria-labelledby pointing to title", async () => {
    renderDataTable();
    await waitFor(() =>
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    userEvent.click(
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    await waitFor(() => screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "confirm-delete-title"
    );
  });

  test("confirming delete removes the row from the table", async () => {
    renderDataTable();
    await waitFor(() =>
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    userEvent.click(
      screen.getAllByRole("button", { name: /delete engineer at acme/i })[0]
    );
    await waitFor(() => screen.getByRole("dialog"));
    userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(
        screen.queryAllByRole("button", { name: /delete engineer at acme/i })
      ).toHaveLength(0)
    );
  });
});
