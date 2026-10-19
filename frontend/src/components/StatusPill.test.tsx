import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("labels configured integrations as configured, not operational", () => {
    render(<StatusPill status="configurado" />);
    expect(screen.getByText("configurado")).toBeInTheDocument();
    expect(screen.queryByText("operacional")).not.toBeInTheDocument();
  });

  it("shows a disconnected WhatsApp as disconnected instead of operational", () => {
    render(<StatusPill status="disconnected" />);
    expect(screen.getByText("desconectado")).toBeInTheDocument();
  });

  it("renders pending state for not configured services", () => {
    render(<StatusPill status="nao configurado" />);
    expect(screen.getByText("nao configurado")).toBeInTheDocument();
  });
});
