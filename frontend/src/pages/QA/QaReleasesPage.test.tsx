import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../contexts/AuthContext";
import { QaReleasesPage } from "./QaReleasesPage";

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

describe("QA release review scaffold", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => cleanup());

  it("shows the read-only review state to an administrator on local QA", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: "admin" } } as never);

    render(<MemoryRouter><QaReleasesPage /></MemoryRouter>);

    expect(screen.getByRole("region", { name: "Revisão de versões em QA" })).toBeInTheDocument();
    expect(screen.getByText(/Metadados do navegador não são prova/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma versão foi carregada/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar e publicar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeDisabled();
  });

  it("does not show release controls to a non-admin user", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { role: "user" } } as never);

    render(<MemoryRouter><QaReleasesPage /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("requer o ambiente QA e conta administrativa");
    expect(screen.queryByRole("button", { name: "Aprovar e publicar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeitar" })).not.toBeInTheDocument();
  });
});
