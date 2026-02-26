import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddJobModal from "../components/AddJobModal";

const defaultProps = {
  show: true,
  onHide: jest.fn(),
  onAdd: jest.fn(),
  onSave: jest.fn(),
  initialData: null,
  dropdownOptions: { Status: ["Applied", "Rejected", "Offer"] },
};

function renderModal(overrides = {}) {
  return render(<AddJobModal {...defaultProps} {...overrides} />);
}

afterEach(() => jest.clearAllMocks());

// ── ARIA ──────────────────────────────────────────────────────────────────────

describe("AddJobModal — ARIA", () => {
  test('modal dialog has aria-labelledby="add-job-modal-title"', () => {
    renderModal();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "add-job-modal-title"
    );
  });

  test('modal title element has id="add-job-modal-title"', () => {
    renderModal();
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.getElementById("add-job-modal-title")).toBeInTheDocument();
  });
});

// ── date validation ───────────────────────────────────────────────────────────

describe("AddJobModal — date validation", () => {
  test("invalid date shows error feedback with id='date-error'", () => {
    renderModal();
    const dateInput = screen.getByPlaceholderText("mm/dd/yyyy");
    userEvent.clear(dateInput);
    userEvent.type(dateInput, "not-a-date");
    fireEvent.blur(dateInput);
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.getElementById("date-error")).toBeInTheDocument();
    expect(screen.getByText(/enter a date like/i)).toBeInTheDocument();
  });

  test("date input gains aria-describedby when invalid", () => {
    renderModal();
    const dateInput = screen.getByPlaceholderText("mm/dd/yyyy");
    userEvent.clear(dateInput);
    userEvent.type(dateInput, "not-a-date");
    fireEvent.blur(dateInput);
    expect(dateInput).toHaveAttribute("aria-describedby", "date-error");
  });

  test("submit button is disabled when date is invalid", () => {
    renderModal();
    const dateInput = screen.getByPlaceholderText("mm/dd/yyyy");
    userEvent.clear(dateInput);
    userEvent.type(dateInput, "not-a-date");
    fireEvent.blur(dateInput);
    expect(screen.getByRole("button", { name: /add job/i })).toBeDisabled();
  });

  test("onAdd is not called when date is invalid", () => {
    const onAdd = jest.fn();
    renderModal({ onAdd });
    const dateInput = screen.getByPlaceholderText("mm/dd/yyyy");
    userEvent.clear(dateInput);
    userEvent.type(dateInput, "not-a-date");
    fireEvent.blur(dateInput);
    // Click the (disabled) submit button — should not trigger
    userEvent.click(screen.getByRole("button", { name: /add job/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

// ── form submission ───────────────────────────────────────────────────────────

describe("AddJobModal — form submission", () => {
  test("submitting add form with valid date calls onAdd", async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    renderModal({ onAdd });
    // The date field is pre-filled with today's date in mm/dd/yyyy format
    userEvent.click(screen.getByRole("button", { name: /add job/i }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
  });

  test("in edit mode modal title says 'Edit Job'", () => {
    const initialData = {
      id: 5,
      Date: "01/15/2025",
      Role: "Engineer",
      Company: "Acme",
      Status: "Applied",
    };
    renderModal({ initialData });
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.getElementById("add-job-modal-title")).toHaveTextContent(
      "Edit Job"
    );
  });

  test("in edit mode submit button says 'Save Changes'", () => {
    const initialData = {
      id: 5,
      Date: "01/15/2025",
      Role: "Engineer",
      Company: "Acme",
      Status: "Applied",
    };
    renderModal({ initialData });
    expect(
      screen.getByRole("button", { name: /save changes/i })
    ).toBeInTheDocument();
  });
});
