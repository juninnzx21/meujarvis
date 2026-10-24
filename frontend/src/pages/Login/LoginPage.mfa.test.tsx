import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

vi.mock("../../services/api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  friendlyError: () => "Falha de teste"
}));

vi.mock("../../contexts/AuthContext", () => ({ useAuth: vi.fn() }));

const mockedAuth = {
  user: null,
  login: vi.fn(),
  completeMfaLogin: vi.fn(),
  acceptSession: vi.fn(),
  logout: vi.fn(),
  ready: true
};

describe("JARVIS login MFA flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockedAuth as never);
  });

  afterEach(() => cleanup());

  it("enrolls an administrator with QR and reveals recovery codes before accepting the session", async () => {
    mockedAuth.login.mockResolvedValue({ mfaSetupRequired: true, setupToken: "setup-token-for-test" });
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { secret: "TESTSECRET", qrDataUrl: "data:image/png;base64,ZmFrZQ==" } } as never)
      .mockResolvedValueOnce({ data: { token: "session-token", user: { id: "admin-1" }, recoveryCodes: ["RECOVERY-ONCE"] } } as never);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByAltText("QR code de configuração do autenticador")).toHaveAttribute("src", "data:image/png;base64,ZmFrZQ==");
    fireEvent.change(screen.getByLabelText("Código de seis dígitos"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Ativar e confirmar MFA" }));

    expect(await screen.findByText("RECOVERY-ONCE")).toBeInTheDocument();
    expect(api.post).toHaveBeenLastCalledWith("/auth/mfa/enrollment/confirm", { setupToken: "setup-token-for-test", code: "123456" });
    fireEvent.click(screen.getByRole("button", { name: "Guardei os códigos — continuar" }));
    expect(mockedAuth.acceptSession).toHaveBeenCalledWith({ token: "session-token", user: { id: "admin-1" } });
  });

  it("allows an administrator to choose a recovery code at the MFA challenge", async () => {
    mockedAuth.login.mockResolvedValue({ mfaRequired: true, challengeToken: "challenge-token-for-test" });
    mockedAuth.completeMfaLogin.mockResolvedValue(undefined);

    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText(/A senha foi validada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar código de recuperação" }));
    fireEvent.change(screen.getByLabelText("Código de recuperação"), { target: { value: "RECOVERY-ONCE" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar código" }));

    expect(mockedAuth.completeMfaLogin).toHaveBeenCalledWith("challenge-token-for-test", "RECOVERY-ONCE");
  });
});
