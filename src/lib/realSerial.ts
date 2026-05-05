import { SerialConnection } from './serial';

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
  reader: any = null;
  writer: any = null;
  isReading = false;

  async connect(callback: (data: string) => void) {
    try {
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

      // Clean up any existing port first
      if (this.port) {
        try {
          await this.disconnect();
        } catch (e) {
          console.warn('Warning: Failed to clean up previous port:', e);
        }
      }

      // Request a port with USB filters to show only real serial devices
      console.log('Requesting serial port with USB filters...');
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // CP210x (common ESP32)
          { usbVendorId: 0x1a86 }, // CH340 (also common ESP32)
        ],
      });

      console.log('Port selected, opening with baud rate 9600...');
      // Open the port with baud rate 9600
      await this.port.open({ baudRate: 9600 });
      console.log('Port opened successfully!');

      // Set up the input stream with TextDecoderStream
      console.log('Setting up data streams...');
      const decoder = new TextDecoderStream();
      this.port.readable.pipeTo(decoder.writable as any);
      this.reader = decoder.readable.getReader();

      // Set up the output stream with TextEncoderStream
      const encoder = new TextEncoderStream();
      encoder.readable.pipeTo(this.port.writable as any);
      this.writer = encoder.writable.getWriter();

      console.log('Streams set up, starting continuous reading...');
      // Start reading continuously
      this.isReading = true;
      this.startReading(callback);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  private async startReading(callback: (data: string) => void) {
    if (!this.reader) return;

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          callback(value);
        }
      }
    } catch (error) {
      console.error('Error reading from serial port:', error);
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

    // Give the reading loop a moment to stop
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Close everything in reverse order of creation
    try {
      if (this.writer) {
        await this.writer.close().catch(() => {});
      }
    } catch (e) {
      // Ignore errors
    }

    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
      }
    } catch (e) {
      // Ignore errors
    }

    try {
      if (this.port) {
        await this.port.close().catch(() => {});
      }
    } catch (e) {
      // Ignore errors
    }

    // Clean up references
    this.reader = null;
    this.writer = null;
    this.port = null;

    console.log('Serial port disconnected and cleaned up');
  }
}
