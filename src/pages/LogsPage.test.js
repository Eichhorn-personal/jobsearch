import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import LogsPage from "./LogsPage";

jest.mock("../hooks/useApi", () => ({ useApi: jest.fn() }));

const SAMPLE_LOGS = [
  { id: 1, event: "JOB_CREATED", timestamp: "2025-01-15T10:00:00Z", data: { role: "Engineer", company: "Acme" } },
  { id: 2, event: "USER_LOGIN",  timestamp: "2025-01-16T11:00:00Z", data: { username: "user@example.com" } },
];

function makeRequest(logs = SAMPLE_LOGS) {
  return jest.fn().mockResolvedValue({ json: () => Promise.resolve([...logs]) });
}

function renderLogsPage(logs = SAMPLE_LOGS) {
  const mockRequest = makeRequest(logs);
  useApi.mockReturnValue({ request: mockRequest });
  render(
    <MemoryRouter>
      <AuthProvider>
        <LogsPage />
      </AuthProvider>
    </MemoryRouter>
  );
  return { mockRequest };
}

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ── rendering ─────────────────────────────────────────────────────────────────

describe("LogsPage — rendering", () => {
  test("shows Activity Log title", async () => {
    renderLogsPage();
    await act(async () => {});
    expect(screen.getByText(/activity log/i)).toBeInTheDocument();
  });

  test("renders desktop table with accessible label", async () => {
    renderLogsPage();
    await act(async () => {});
    expect(
      screen.getByRole("table", { name: /activity log entries/i })
    ).toBeInTheDocument();
  });

  test("shows event chips for each entry", async () => {
    renderLogsPage();
    await act(async () => {});
    // Each event appears in both the mobile card and desktop table row
    expect(screen.getAllByText("JOB_CREATED").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("USER_LOGIN").length).toBeGreaterThanOrEqual(1);
  });

  test("shows entry detail values", async () => {
    renderLogsPage();
    await act(async () => {});
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("user@example.com").length).toBeGreaterThanOrEqual(1);
  });

  test("shows empty state when there are no log entries", async () => {
    renderLogsPage([]);
    await act(async () => {});
    expect(screen.getByText(/no log entries yet/i)).toBeInTheDocument();
  });

  test("Back button is present with accessible label", async () => {
    renderLogsPage();
    await act(async () => {});
    expect(screen.getByRole("button", { name: /back to admin/i })).toBeInTheDocument();
  });

  test("Refresh button is present with accessible label", async () => {
    renderLogsPage();
    await act(async () => {});
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });
});

// ── mobile cards ──────────────────────────────────────────────────────────────

describe("LogsPage — mobile cards", () => {
  test("renders a card for each log entry", async () => {
    renderLogsPage();
    await act(async () => {});
    // eslint-disable-next-line testing-library/no-node-access
    const cards = document.querySelectorAll(".log-card");
    expect(cards.length).toBe(SAMPLE_LOGS.length);
  });

  test("each card contains an event chip", async () => {
    renderLogsPage();
    await act(async () => {});
    // eslint-disable-next-line testing-library/no-node-access
    const cards = document.querySelectorAll(".log-card");
    cards.forEach(card => {
      // eslint-disable-next-line testing-library/no-node-access
      expect(card.querySelector(".status-chip")).not.toBeNull();
    });
  });

  test("each card shows a timestamp", async () => {
    renderLogsPage();
    await act(async () => {});
    // eslint-disable-next-line testing-library/no-node-access
    const times = document.querySelectorAll(".log-card-time");
    expect(times.length).toBe(SAMPLE_LOGS.length);
    times.forEach(t => expect(t.textContent.trim()).not.toBe(""));
  });
});

// ── sort ──────────────────────────────────────────────────────────────────────

describe("LogsPage — sort", () => {
  test("Time column header defaults to descending", async () => {
    renderLogsPage();
    await act(async () => {});
    const timeHeader = screen.getByRole("columnheader", { name: /time/i });
    expect(timeHeader).toHaveAttribute("aria-sort", "descending");
  });

  test("clicking Time header toggles to ascending", async () => {
    renderLogsPage();
    await act(async () => {});
    const timeHeader = screen.getByRole("columnheader", { name: /time/i });
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(timeHeader.querySelector("button"));
    expect(timeHeader).toHaveAttribute("aria-sort", "ascending");
  });

  test("clicking Time header twice returns to descending", async () => {
    renderLogsPage();
    await act(async () => {});
    const timeHeader = screen.getByRole("columnheader", { name: /time/i });
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(timeHeader.querySelector("button"));
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(timeHeader.querySelector("button"));
    expect(timeHeader).toHaveAttribute("aria-sort", "descending");
  });
});

// ── filter ────────────────────────────────────────────────────────────────────

describe("LogsPage — filter", () => {
  test("filtering by JOB_CREATED hides USER_LOGIN entry details", async () => {
    renderLogsPage();
    await act(async () => {});
    const select = screen.getByRole("combobox", { name: /filter by event type/i });
    userEvent.selectOptions(select, "JOB_CREATED");
    // "user@example.com" only appears in the USER_LOGIN entry's data
    await waitFor(() =>
      expect(screen.queryByText("user@example.com")).not.toBeInTheDocument()
    );
  });

  test("clearing filter shows all entries again", async () => {
    renderLogsPage();
    await act(async () => {});
    const select = screen.getByRole("combobox", { name: /filter by event type/i });
    userEvent.selectOptions(select, "JOB_CREATED");
    await waitFor(() =>
      expect(screen.queryByText("user@example.com")).not.toBeInTheDocument()
    );
    userEvent.selectOptions(select, "");
    await waitFor(() =>
      expect(screen.getAllByText("user@example.com").length).toBeGreaterThanOrEqual(1)
    );
  });
});

// ── search ────────────────────────────────────────────────────────────────────

describe("LogsPage — search", () => {
  test("searching by detail value hides non-matching entries", async () => {
    renderLogsPage();
    await act(async () => {});
    const input = screen.getByRole("searchbox", { name: /search log entries/i });
    userEvent.type(input, "Engineer");
    // "user@example.com" only in USER_LOGIN entry — should be hidden
    await waitFor(() =>
      expect(screen.queryByText("user@example.com")).not.toBeInTheDocument()
    );
  });

  test("shows no-match message when search matches nothing", async () => {
    renderLogsPage();
    await act(async () => {});
    const input = screen.getByRole("searchbox", { name: /search log entries/i });
    userEvent.type(input, "xyznotfound");
    await waitFor(() =>
      expect(screen.getByText(/no entries match/i)).toBeInTheDocument()
    );
  });

  test("Refresh button calls the API again", async () => {
    const { mockRequest } = renderLogsPage();
    await act(async () => {});
    const callsBefore = mockRequest.mock.calls.length;
    userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await act(async () => {});
    expect(mockRequest.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
