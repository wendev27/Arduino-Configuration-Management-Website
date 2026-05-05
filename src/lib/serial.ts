export interface SerialConnection {
  connect(callback: (data: string) => void): Promise<void>;
  disconnect(): Promise<void>;
  send(cmd: string): Promise<void>;
}
