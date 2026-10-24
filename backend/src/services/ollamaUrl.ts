export function normalizePrivateOllamaUrl(value: string) {
  const baseUrl = value.trim().replace(/\/+$/, "");
  if (!baseUrl) return "";
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new Error("URL do Ollama inválida."); }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("Informe apenas a URL base privada do Ollama.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = host.split(".").map(Number);
  const isIpv4 = ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
  const privateIpv4 = isIpv4 && (
    ipv4[0] === 10 || ipv4[0] === 127 ||
    (ipv4[0] === 192 && ipv4[1] === 168) ||
    (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
    (ipv4[0] === 100 && ipv4[1] >= 64 && ipv4[1] <= 127)
  );
  const privateIpv6 = host === "::1" || host.startsWith("fc") || host.startsWith("fd");
  const localName = host === "localhost" || host === "ollama";
  if (!(url.protocol === "http:" || url.protocol === "https:") || !(privateIpv4 || privateIpv6 || localName)) {
    throw new Error("Ollama deve usar localhost, o serviço Docker 'ollama' ou um IP privado literal (LAN/VPN); URLs públicas não são permitidas.");
  }
  return baseUrl;
}
