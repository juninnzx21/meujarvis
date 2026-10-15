import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JarvisFloatingAssistant } from "./JarvisFloatingAssistant";

const { post, startListening, speakJarvis, requestFullscreen, exitFullscreen } = vi.hoisted(() => ({
  post: vi.fn(),
  startListening: vi.fn(),
  speakJarvis: vi.fn(),
  requestFullscreen: vi.fn(),
  exitFullscreen: vi.fn()
}));

vi.mock("../services/api", () => ({
  api: { post },
  friendlyError: (error: unknown) => error instanceof Error ? error.message : "Erro"
}));
vi.mock("../services/speechRecognitionService", () => ({
  isSpeechRecognitionSupported: () => true,
  startListening,
  stopListening: vi.fn()
}));
vi.mock("../services/textToSpeechService", () => ({
  loadVoiceSettings: () => ({ lang: "pt-BR" }),
  speakJarvis,
  stopSpeaking: vi.fn()
}));

describe("JARVIS floating assistant", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.jarvisDesktop;
    startListening.mockReturnValue(true);
    speakJarvis.mockResolvedValue(true);
    post.mockResolvedValue({ data: { conversationId: "conversation-1", reply: "Tudo certo." } });
    document.documentElement.requestFullscreen = requestFullscreen.mockResolvedValue(undefined);
    document.exitFullscreen = exitFullscreen.mockResolvedValue(undefined);
  });

  it("keeps the microphone off until the user explicitly starts voice mode", async () => {
    render(<JarvisFloatingAssistant />);
    expect(startListening).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    expect(screen.getByText("Pronto para conversar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ativar conversa por voz" }));
    await waitFor(() => expect(startListening).toHaveBeenCalledTimes(1));
    expect(startListening).toHaveBeenCalledWith(expect.objectContaining({ lang: "pt-BR", onTranscript: expect.any(Function) }));
  });

  it("sends voice commands to the shared voice AI endpoint and speaks the answer", async () => {
    render(<JarvisFloatingAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    fireEvent.click(screen.getByRole("button", { name: "Ativar conversa por voz" }));
    await waitFor(() => expect(startListening).toHaveBeenCalledTimes(1));
    const options = startListening.mock.calls[0][0];
    options.onTranscript("Jarvis, status do sistema");
    await waitFor(() => expect(post).toHaveBeenCalledWith("/voice/process", { text: "Jarvis, status do sistema" }));
    await waitFor(() => expect(speakJarvis).toHaveBeenCalledWith("Tudo certo.", undefined, expect.objectContaining({ onEnd: expect.any(Function) })));
    expect(await screen.findByText("Tudo certo.")).toBeInTheDocument();
  });

  it("routes local PC commands to the native companion without sending them to the server", async () => {
    const executeLocalCommand = vi.fn().mockResolvedValue({ handled: true, message: "Abri a calculadora." });
    window.jarvisDesktop = { isDesktop: true, executeLocalCommand, showAssistant: vi.fn(), authorizeMicrophone: vi.fn().mockResolvedValue(true) };
    render(<JarvisFloatingAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Mensagem para JARVIS" }), { target: { value: "Jarvis, abra a calculadora" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await waitFor(() => expect(executeLocalCommand).toHaveBeenCalledWith("Jarvis, abra a calculadora"));
    expect(post).not.toHaveBeenCalled();
    expect(await screen.findByText("Abri a calculadora.")).toBeInTheDocument();
  });

  it("authorizes microphone from the explicit voice button before listening", async () => {
    const authorizeMicrophone = vi.fn().mockResolvedValue(true);
    window.jarvisDesktop = { isDesktop: true, executeLocalCommand: vi.fn(), showAssistant: vi.fn(), authorizeMicrophone };
    render(<JarvisFloatingAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    fireEvent.click(screen.getByRole("button", { name: "Ativar conversa por voz" }));
    await waitFor(() => expect(startListening).toHaveBeenCalledTimes(1));
    expect(authorizeMicrophone).toHaveBeenCalledTimes(1);
  });

  it("explains operating-system microphone denial without referring to the tray", async () => {
    window.jarvisDesktop = { isDesktop: true, executeLocalCommand: vi.fn(), showAssistant: vi.fn(), authorizeMicrophone: vi.fn().mockResolvedValue(true) };
    render(<JarvisFloatingAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    fireEvent.click(screen.getByRole("button", { name: "Ativar conversa por voz" }));
    await waitFor(() => expect(startListening).toHaveBeenCalledTimes(1));
    act(() => startListening.mock.calls.at(-1)?.[0].onError("Permissao do microfone negada pelo navegador."));
    expect(screen.getByText(/Configurações > Privacidade e segurança > Microfone/)).toBeInTheDocument();
  });

  it("opens the assistant in immersive full-screen mode", async () => {
    render(<JarvisFloatingAssistant />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente JARVIS" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir em tela cheia" }));
    expect(await screen.findByText("INTERFACE IMERSIVA · SISTEMA ONLINE")).toBeInTheDocument();
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sair da tela cheia" })).toBeInTheDocument();
  });
});
