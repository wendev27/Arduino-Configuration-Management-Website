import { SerialConnection, SerialConnectOptions } from './serial';

// Web Serial API types (local declarations)
interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}

export class RealSerial implements SerialConnection {
  port: SerialPort | null = null;
  reader: ReadableStreamDefaultReader<string> | null = null;
  writer: WritableStreamDefaultWriter<string> | null = null;
  /** Resolves when the port.readable → decoder pipe has finished */
  private readPipeDone: Promise<unknown> | null = null;
  /** Resolves when the encoder → port.writable pipe has finished */
  private writePipeDone: Promise<unknown> | null = null;
  private onDeviceLost: ((reason?: unknown) => void) | null = null;
  isReading = false;

  /** pipeTo locks the port; without a full teardown, reconnect hits "already open". */
  private async ensurePortOpen(port: SerialPort, baudRate: number) {
    try {
      await port.open({ baudRate });
    } catch (e: unknown) {
      const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: unknown }).name) : '';
      if (name === 'InvalidStateError') {
        await port.close().catch(() => {});
        await new Promise((r) => setTimeout(r, 50));
        await port.open({ baudRate });
        return;
      }
      throw e;
    }
  }

  async connect(callback: (data: string) => void, options?: SerialConnectOptions) {
    try {
      this.onDeviceLost = options?.onDeviceLost ?? null;
      // Debug: Check environment and API availability
      console.log('Environment check:');
      console.log('- Location protocol:', window.location.protocol);
      console.log('- navigator.serial:', (navigator as any).serial);

      if (!(navigator as any).serial) {
        throw new Error(
          'Web Serial API not supported. Please use Chrome or Edge browser.'
        );
      }

      if (
        window.location.protocol !== 'http:' &&
        window.location.protocol !== 'https:'
      ) {
        throw new Error(
          'Web Serial API requires HTTP/HTTPS. Please run on localhost, not file://'
        );
      }

      // Request a port with USB filters to show only real serial devices
      console.log('Requesting serial port with USB filters...');
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // CP210x (common ESP32)
          { usbVendorId: 0x1a86 }, // CH340 (also common ESP32)
        ],
      });
      this.port = port;

      console.log('Port selected, opening with baud rate 9600...');
      await this.ensurePortOpen(port, 9600);
      console.log('Port opened successfully!');

      // Set up the input stream with TextDecoderStream
      console.log('Setting up data streams...');
      const decoder = new TextDecoderStream();
      this.readPipeDone = port.readable.pipeTo(decoder.writable as WritableStream<Uint8Array>);
      void this.readPipeDone.catch(() => {});
      this.reader = decoder.readable.getReader();

      // Set up the output stream with TextEncoderStream
      const encoder = new TextEncoderStream();
      this.writePipeDone = encoder.readable.pipeTo(port.writable as WritableStream<Uint8Array>);
      void this.writePipeDone.catch(() => {});
      this.writer = encoder.writable.getWriter();

      console.log('Streams set up, starting continuous reading...');
      // Start reading continuously
      this.isReading = true;
      void this.startReading(callback);
    } catch (error) {
      console.error('Failed to connect:', error);
      await this.disconnect().catch(() => {});
      throw error;
    }
  }

  private async startReading(callback: (data: string) => void) {
    const reader = this.reader;
    if (!reader) return;

    try {
      while (this.isReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          callback(value);
        }
      }
    } catch (error) {
      // Intentional disconnect() sets isReading false before cancel; ignore that path.
      if (!this.isReading) {
        return;
      }

      console.warn('Serial read ended:', error);

      const notify = this.onDeviceLost;
      this.onDeviceLost = null;
      await this.disconnect().catch(() => {});
      notify?.(error);
    }
  }

  async send(cmd: string) {
    if (!this.writer) return;
    try {
      await this.writer.write(cmd + '\n');
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }

  async disconnect() {
    this.isReading = false;
    this.onDeviceLost = null;

    const reader = this.reader;
    const writer = this.writer;
    const port = this.port;
    const readPipeDone = this.readPipeDone;
    const writePipeDone = this.writePipeDone;

    this.reader = null;
    this.writer = null;
    this.port = null;
    this.readPipeDone = null;
    this.writePipeDone = null;

    if (reader) {
      await reader.cancel().catch(() => {});
      await reader.closed.catch(() => {});
    }

    if (readPipeDone) {
      await readPipeDone.catch(() => {});
    }

    if (writer) {
      await writer.close().catch(() => {});
      await writer.closed.catch(() => {});
    }

    if (writePipeDone) {
      await writePipeDone.catch(() => {});
    }

    if (port) {
      await port.close().catch(() => {});
    }

    console.log('Serial port disconnected and cleaned up');
  }
}
