import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadsCenterPage } from "./DownloadsCenterPage";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,verified-qr") } }));

describe("DownloadsCenterPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("publishes the verified Windows artifact and checksum", async () => {
    render(<MemoryRouter><DownloadsCenterPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /baixar instalador/i })).toHaveAttribute("href", "/downloads/JARVIS-Desktop-Setup-x64.exe");
    expect(screen.getByText(/não assinada/i)).toBeInTheDocument();
    expect(screen.getByText("0248fb9d25173d54b882c1d410c6964e174de00597971925db2b1d13e27d4291")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("img", { name: /qr code da página oficial/i })).toHaveAttribute("src", "data:image/png;base64,verified-qr"));
  });

  it("does not offer a download link for an unpublished Android package", () => {
    render(<MemoryRouter><DownloadsCenterPage /></MemoryRouter>);
    expect(screen.getByText("APK/AAB não publicado")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /baixar apk/i })).not.toBeInTheDocument();
  });
});
