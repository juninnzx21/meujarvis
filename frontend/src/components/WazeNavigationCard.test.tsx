import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WazeNavigationCard } from "./WazeNavigationCard";

describe("WazeNavigationCard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets the user prepare a route for a typed destination", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WazeNavigationCard />);
    fireEvent.change(screen.getByLabelText("Endereço ou destino"), { target: { value: "Praça Sete, Belo Horizonte" } });
    const button = screen.getByRole("button", { name: /abrir rota/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("q=Pra%C3%A7a+Sete%2C+Belo+Horizonte"), "_blank", "noopener,noreferrer");
  });

  it("offers the home and work favorites saved in Waze", () => {
    render(<WazeNavigationCard />);
    expect(screen.getByRole("link", { name: /favorito casa/i })).toHaveAttribute("href", expect.stringContaining("favorite=home"));
    expect(screen.getByRole("link", { name: /favorito trabalho/i })).toHaveAttribute("href", expect.stringContaining("favorite=work"));
  });
});
