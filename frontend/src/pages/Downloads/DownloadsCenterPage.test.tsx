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

  it("links to the Windows release installer and its checksums", async () => {
    render(<MemoryRouter><DownloadsCenterPage /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /baixar instalador/i })).toHaveAttribute("href", "https://github.com/juninnzx21/meujarvis/releases/download/v2.0.0/JARVIS-2.0.0-Desktop-Setup-x64.exe");
    expect(screen.getByText(/não assinada/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir checksums sha-256/i })).toHaveAttribute("href", "https://github.com/juninnzx21/meujarvis/releases/download/v2.0.0/SHA256SUMS.txt");
    await waitFor(() => expect(screen.getByRole("img", { name: /qr code para baixar o apk/i })).toHaveAttribute("src", "data:image/png;base64,verified-qr"));
  });

  it("offers the signed Android APK as a direct download", () => {
    render(<MemoryRouter><DownloadsCenterPage /></MemoryRouter>);
    expect(screen.getByText("APK assinado e verificado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /baixar apk/i })).toHaveAttribute("href", "https://github.com/juninnzx21/meujarvis/releases/download/v2.0.0/JARVIS-2.0.0-Android.apk");
  });
});
