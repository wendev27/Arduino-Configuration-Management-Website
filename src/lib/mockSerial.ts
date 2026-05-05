import { SerialConnection } from './serial';

export class MockSerial implements SerialConnection {
  interval: NodeJS.Timeout | null = null;
  callback: ((data: string) => void) | null = null;

  async connect(callback: (data: string) => void) {
    this.callback = callback;
    callback('ESP32_READY');
    callback('MAC:DE:AD:BE:EF:00');

    this.interval = setInterval(() => {
      const waterLevel = Math.floor(Math.random() * 100);
      const interval = 1000;
      callback(`DATA:{"waterLevel":${waterLevel},"interval":${interval}}\n`);
    }, 1500);
  }

  async disconnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.callback = null;
  }

  async send(command: string) {
    if (this.callback) {
      this.callback(`[ACK] ${command}`);
    }
  }
}
