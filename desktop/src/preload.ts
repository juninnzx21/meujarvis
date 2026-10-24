import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("jarvisDesktop", {
  isDesktop: true,
  executeLocalCommand: (text: string) => ipcRenderer.invoke("jarvis:local-command", text),
  showAssistant: () => ipcRenderer.invoke("jarvis:show-assistant"),
  authorizeMicrophone: () => ipcRenderer.invoke("jarvis:authorize-microphone")
});
