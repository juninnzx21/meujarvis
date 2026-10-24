export {};

declare global {
  interface Window {
    jarvisDesktop?: {
      readonly isDesktop: true;
      executeLocalCommand: (text: string) => Promise<{ handled: boolean; message?: string; error?: string }>;
      showAssistant: () => Promise<boolean>;
    };
  }
}
