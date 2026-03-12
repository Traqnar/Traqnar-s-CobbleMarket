export {};

declare global {
  interface Window {
    electronUpdates?: {
      getVersion: () => Promise<string>;
      onStatus: (
        callback: (status: {
          state?: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
          message?: string;
          progress?: number;
          version?: string;
          details?: string;
        }) => void,
      ) => () => void;
    };
  }
}
