const examples = [
  "Certo. Verifiquei o sistema e esta tudo operacional.",
  "Ha pendencias que exigem sua confirmacao.",
  "A conexao com o WhatsApp ainda nao esta configurada.",
  "O financeiro possui lancamentos pendentes de revisao.",
  "Posso preparar essa acao, mas nao vou executar sem sua autorizacao."
];

export const jarvisVoicePersona = {
  name: "JARVIS BR Premium",
  description: "Voz original do projeto: portugues brasileiro claro, tom profissional, frases curtas e postura de assistente executivo.",
  examples
};

export function applyJarvisVoicePersona(reply: string) {
  const clean = reply.trim().replace(/\s+/g, " ");
  if (!clean) return "Nao recebi conteudo suficiente para responder.";
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 4);
  const concise = sentences.join(" ");
  if (/confirmacao|confirmar|autorizacao|sensivel|perig/i.test(concise)) {
    return concise.includes("sem sua autorizacao") ? concise : `${concise} Nao vou executar sem sua autorizacao.`;
  }
  return concise;
}
