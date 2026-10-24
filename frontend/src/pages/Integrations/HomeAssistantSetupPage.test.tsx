import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HomeAssistantSetupPage } from "./HomeAssistantSetupPage";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  },
  friendlyError: () => "Falha de teste"
}));

describe("Home Assistant assisted linking", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/home-assistant/status") return Promise.resolve({ data: { configured: false, tokenConfigured: false } } as never);
      if (url === "/home-assistant/entities") return Promise.resolve({ data: { status: "success", grouped: { light: [{ entity_id: "light.sala" }], sensor: [] } } } as never);
      return Promise.resolve({ data: {} } as never);
    });
    vi.mocked(api.put).mockResolvedValue({ data: { status: "configured" } } as never);
    vi.mocked(api.post).mockResolvedValue({ data: { status: "success" } } as never);
  });

  afterEach(() => cleanup());

  it("saves credentials, tests the API, and reports discovered entities", async () => {
    render(<MemoryRouter><HomeAssistantSetupPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("URL do Home Assistant"), { target: { value: "https://casa.example.test" } });
    fireEvent.change(screen.getByPlaceholderText("Cole o token criado no perfil do Home Assistant"), { target: { value: "temporary-test-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar e testar vínculo" }));

    expect(await screen.findByText(/Vínculo ativo/)).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith("/integrations/setup/home_assistant", { url: "https://casa.example.test", token: "temporary-test-token" });
    expect(api.post).toHaveBeenCalledWith("/integrations/setup/home_assistant/test");
    expect(await screen.findByText(/light: 1/)).toBeInTheDocument();
  });
});
