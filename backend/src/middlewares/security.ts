export const forbiddenActionPatterns = [
  /rm\s+-rf/i,
  /format\s+[a-z]:/i,
  /del\s+\/[sq]/i,
  /shutdown/i,
  /powershell/i,
  /cmd\.exe/i,
  /bash/i,
  /capturar senha/i,
  /burlar login/i,
  /spam/i
];

export const sensitiveHomeDomains = ["lock", "cover", "alarm_control_panel", "garage", "gate"];

export const isForbiddenAction = (value: unknown) => {
  const text = JSON.stringify(value ?? "");
  return forbiddenActionPatterns.some((pattern) => pattern.test(text));
};

export const isSensitiveHomeAction = (value: unknown) => {
  const text = JSON.stringify(value ?? "").toLowerCase();
  return sensitiveHomeDomains.some((domain) => text.includes(domain)) || /port[aã]o|garagem|fechadura|alarme|destravar|abrir/i.test(text);
};
