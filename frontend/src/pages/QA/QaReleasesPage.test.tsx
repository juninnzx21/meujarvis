import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import { QaReleasesPage } from "./QaReleasesPage";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../services/api", () => ({ api: { get: vi.fn() } }));
const candidate = {
  id: "candidate-1", commitSha: "a".repeat(40), sourceBranch: "main", target: "qa",
  status: "DRAFT", artifactName: "jarvis-test", artifactDigest: `sha256:${"b".repeat(64)}`,
  workflowRunId: "123", ciConclusion: "unverified", sourceVerifiedAt: null,
  checksVerifiedAt: null, stagingValidatedAt: null, rollbackVerifiedAt: null,
  approvalRequests: [], auditEvents: [], workflowRunUrl: "javascript:alert(1)"
};
const mount = () => render(<MemoryRouter><QaReleasesPage /></MemoryRouter>);
describe("QA release API read-only view", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(api.get).mockResolvedValue({ data: { candidates: [] } });
  });
  afterEach(cleanup);
  it("loads the real empty state and keeps publishing disabled", async () => {
    mount();
    expect(await screen.findByText("Nenhuma versão candidata registrada.")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/releases/candidates", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByRole("button", { name: "Aprovar e publicar" })).toBeDisabled();
  });
  it("renders identity and pending evidence without trusting a supplied URL", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { candidates: [candidate] } });
    mount();
    expect(await screen.findByText(candidate.commitSha)).toBeInTheDocument();
    expect(screen.getByText(candidate.artifactDigest)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consultar execução da CI" })).toHaveAttribute("href", "https://github.com/juninnzx21/meujarvis/actions/runs/123");
    expect(screen.getAllByText("Pendente")).toHaveLength(4);
  });
  it("does not query the API for non-admin users", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: "user" } } as never);
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent("requer o ambiente QA");
    expect(api.get).not.toHaveBeenCalled();
  });
  it("distinguishes request failure from empty results and allows retry", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("private diagnostic"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível consultar");
    expect(screen.queryByText(/private diagnostic/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar versões" }));
    expect(await screen.findByText("Nenhuma versão candidata registrada.")).toBeInTheDocument();
  });
  it("rejects malformed responses instead of displaying invented state", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { candidates: [{ ...candidate, auditEvents: null }] } });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível consultar");
    expect(screen.queryByText(candidate.commitSha)).not.toBeInTheDocument();
  });
  it("cancels an outstanding request on unmount", async () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    const view = mount();
    await waitFor(() => expect(api.get).toHaveBeenCalledOnce());
    const signal = vi.mocked(api.get).mock.calls[0][1]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
