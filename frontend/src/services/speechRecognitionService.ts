type RecognitionCallback = (text: string) => void;
type ErrorCallback = (message: string) => void;

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (event: { error?: string }) => void;
  onresult?: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    SpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

let activeRecognition: BrowserSpeechRecognition | null = null;
let transcriptHandler: RecognitionCallback | null = null;
let errorHandler: ErrorCallback | null = null;

export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function onTranscript(callback: RecognitionCallback) {
  transcriptHandler = callback;
}

export function onError(callback: ErrorCallback) {
  errorHandler = callback;
}

export function startListening(options: { lang?: string; onStart?: () => void; onEnd?: () => void } = {}) {
  if (!isSpeechRecognitionSupported()) {
    errorHandler?.("Reconhecimento de voz indisponivel neste navegador. Use o campo de texto.");
    return false;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  activeRecognition = new Recognition!();
  activeRecognition.lang = options.lang || "pt-BR";
  activeRecognition.continuous = false;
  activeRecognition.interimResults = false;
  activeRecognition.onstart = options.onStart;
  activeRecognition.onend = options.onEnd;
  activeRecognition.onerror = (event) => {
    errorHandler?.(event.error === "not-allowed" ? "Permissao do microfone negada pelo navegador." : "Nao foi possivel capturar o audio agora.");
  };
  activeRecognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    transcriptHandler?.(transcript);
  };
  activeRecognition.start();
  return true;
}

export function stopListening() {
  activeRecognition?.stop();
  activeRecognition = null;
}
