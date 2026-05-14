import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders operational state for configured services", () => {
    render(<StatusPill status="configurado" />);
    expect(screen.getByText("operacional")).toBeInTheDocument();
  });

  it("renders pending state for not configured services", () => {
    render(<StatusPill status="nao configurado" />);
    expect(screen.getByText("nao configurado")).toBeInTheDocument();
  });
});
