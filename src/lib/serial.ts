/** Optional callbacks for connect(); mock impl may ignore extras. */
export type SerialConnectOptions = {
  /** USB unplug, watchdog reset after flash, chip reboot — read stream dies. */
  onDeviceLost?: (reason?: unknown) => void;
};

export interface SerialConnection {
  connect(
    callback: (data: string) => void,
    options?: SerialConnectOptions
  ): Promise<void>;
  disconnect(): Promise<void>;
  send(cmd: string): Promise<void>;
}
