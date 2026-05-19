import { useCallback, useEffect, useRef, useState } from 'react';
import { MockSerial } from '../lib/mockSerial';
import { RealSerial } from '../lib/realSerial';
import { SerialConnection } from '../lib/serial';
import { registerDeviceMac, updateSensorBarangay } from '../lib/supabaseClient';

export type SensorData = {
  waterLevel: number | null;
  interval: number | null;
};

const MAX_LOG_LINES = 100;
const SENSOR_UPDATE_DELAY_MS = 500;
const USE_REAL = true;

/** Firmware may prefix lines (e.g. `BADING ... ":DATA:{...}`); find marker anywhere. */
function parseDataPayload(line: string): { waterLevel: number | null; interval: number | null } | null {
  const marker = 'DATA:';
  const idx = line.indexOf(marker);
  if (idx === -1) return null;
  const after = line.slice(idx + marker.length);
  const start = after.indexOf('{');
  const end = after.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(after.slice(start, end + 1)) as Record<string, unknown>;
    return {
      waterLevel: typeof parsed.waterLevel === 'number' ? parsed.waterLevel : null,
      interval: typeof parsed.interval === 'number' ? parsed.interval : null,
    };
  } catch {
    return null;
  }
}

/** Accepts Arduino `WiFi.macAddress()` (colons/hyphens) or compact 12-hex forms; trims junk after MAC. */
function parseMacFromLine(line: string): string | null {
  const marker = 'MAC:';
  const idx = line.indexOf(marker);
  if (idx === -1) return null;

  let tail = line.slice(idx + marker.length).trim().replace(/^["']/u, '');
  tail = tail.split(/[^\dA-Fa-f:-]/)[0]?.trim() ?? '';

  const hexDigits = tail.replace(/[^0-9A-Fa-f]/gi, '');
  if (/^[0-9A-Fa-f]{12}$/i.test(hexDigits)) {
    if (/^0{12}$/i.test(hexDigits)) return null;
    return hexDigits
      .toLowerCase()
      .match(/../g)!
      .join(':');
  }

  const delimited =
    tail.match(/^([0-9A-Fa-f]{2})(?::[0-9A-Fa-f]{2}|-[0-9A-Fa-f]{2}){5}\b/i)?.[0] ??
    tail.match(/^([0-9A-Fa-f]{2})(?::[0-9A-Fa-f]{2}|-[0-9A-Fa-f]{2}){4,}\b/i)?.[0];

  if (!delimited) return null;

  const fromDelim = delimited.replace(/-/g, ':').replace(/[^0-9A-Fa-f]/gi, '');
  if (fromDelim.length !== 12 || /^0{12}$/i.test(fromDelim)) return null;

  return fromDelim
    .toLowerCase()
    .match(/../g)!
    .join(':');
}

/** STA MAC reads as all zeros until WiFi.stack is minimally initialized — see Arduino `WiFi.mode(WIFI_STA)`. */
function lineHasUnsetMacZeros(line: string): boolean {
  const marker = 'MAC:';
  const idx = line.indexOf(marker);
  if (idx === -1) return false;

  let tail = line.slice(idx + marker.length).trim().replace(/^["']/u, '');
  tail = tail.split(/[^\dA-Fa-f:-]/)[0]?.trim() ?? '';
  const hexDigits = tail.replace(/[^0-9A-Fa-f]/gi, '');
  return /^0{12}$/i.test(hexDigits);
}

export function useSerial() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [macAddress, setMacAddress] = useState('');
  const [deviceReady, setDeviceReady] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData>({
    waterLevel: null,
    interval: null,
  });
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [pendingMacForModal, setPendingMacForModal] = useState<string | null>(
    null
  );
  const [isSubmittingBarangay, setIsSubmittingBarangay] = useState(false);

  const serialRef = useRef<SerialConnection | null>(null);
  const bufferRef = useRef('');
  const lastSensorUpdateRef = useRef(0);
  const pendingSensorDataRef = useRef<SensorData | null>(null);
  const sensorUpdateTimeoutRef = useRef<number | null>(null);
  const registeredMacRef = useRef<string | null>(null);
  const zeroMacHintPostedRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported('serial' in navigator);
    }
  }, []);

  const cleanupSerial = useCallback(async () => {
    if (sensorUpdateTimeoutRef.current) {
      window.clearTimeout(sensorUpdateTimeoutRef.current);
      sensorUpdateTimeoutRef.current = null;
    }

    if (serialRef.current) {
      try {
        await serialRef.current.disconnect();
      } catch (error) {
        console.warn('Cleanup disconnect failed:', error);
      }
      serialRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupSerial();
    };
  }, [cleanupSerial]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleUnload = () => {
      cleanupSerial();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [cleanupSerial]);

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LOG_LINES
        ? next.slice(next.length - MAX_LOG_LINES)
        : next;
    });
  }, []);

  const commitSensorData = useCallback((next: SensorData) => {
    if (!isMountedRef.current) return;
    setSensorData(next);
    lastSensorUpdateRef.current = Date.now();
  }, []);

  const scheduleSensorDataUpdate = useCallback(
    (next: SensorData) => {
      const now = Date.now();
      const elapsed = now - lastSensorUpdateRef.current;

      if (elapsed >= SENSOR_UPDATE_DELAY_MS) {
        if (sensorUpdateTimeoutRef.current) {
          window.clearTimeout(sensorUpdateTimeoutRef.current);
          sensorUpdateTimeoutRef.current = null;
        }
        commitSensorData(next);
        return;
      }

      pendingSensorDataRef.current = next;
      if (sensorUpdateTimeoutRef.current) {
        return;
      }

      const wait = SENSOR_UPDATE_DELAY_MS - elapsed;
      sensorUpdateTimeoutRef.current = window.setTimeout(() => {
        sensorUpdateTimeoutRef.current = null;
        if (pendingSensorDataRef.current) {
          commitSensorData(pendingSensorDataRef.current);
          pendingSensorDataRef.current = null;
        }
      }, wait) as unknown as number;
    },
    [commitSensorData]
  );

  const registerMacAddress = useCallback(
    async (mac: string) => {
      const normalizedMac = mac.trim().toLowerCase();
      if (!normalizedMac || registeredMacRef.current === normalizedMac) {
        return;
      }

      registeredMacRef.current = normalizedMac;
      const result = await registerDeviceMac(normalizedMac);

      if (result.error) {
        registeredMacRef.current = null;
        pushLog(`[ERROR] Supabase registration failed for ${normalizedMac}`);
        setConnectionError(
          `Device registration failed: ${result.error.message || 'Database error'}`
        );
        return;
      }

      if (result.existed) {
        pushLog(`Supabase device found: ${normalizedMac}`);
      } else {
        pushLog(`Supabase device registered: ${normalizedMac}`);
        setPendingMacForModal(normalizedMac);
        setShowAddSensorModal(true);
      }
    },
    [pushLog]
  );

  const processSerialLine = useCallback(
    (line: string) => {
      const cleaned = line.trim();
      if (!cleaned) return;

      const sensor = parseDataPayload(cleaned);
      if (sensor) {
        scheduleSensorDataUpdate(sensor);
      }

      const mac = parseMacFromLine(cleaned);
      if (mac) {
        setMacAddress(mac);
        registerMacAddress(mac);
      } else if (lineHasUnsetMacZeros(cleaned) && !zeroMacHintPostedRef.current) {
        zeroMacHintPostedRef.current = true;
        pushLog(
          '[Hint] MAC is all zeros until Wi-Fi STA is initialized. Before printing MAC call: WiFi.mode(WIFI_STA);'
        );
      }

      if (cleaned.includes('ESP32_READY')) {
        setDeviceReady(true);
      }

      pushLog(cleaned);
    },
    [pushLog, registerMacAddress, scheduleSensorDataUpdate]
  );

  const handleSerialChunk = useCallback(
    (chunk: string) => {
      bufferRef.current += chunk;
      const lines = bufferRef.current.split(/\r?\n/);
      bufferRef.current = lines.pop() ?? '';
      lines.forEach((line) => processSerialLine(line));
    },
    [processSerialLine]
  );

  const connect = async () => {
    setConnectionError(null);
    setIsConnecting(true);
    setDeviceReady(false);
    bufferRef.current = '';
    pendingSensorDataRef.current = null;
    lastSensorUpdateRef.current = 0;
    zeroMacHintPostedRef.current = false;

    if (!isSupported) {
      setConnectionError(
        'Web Serial API is not supported in this browser. Please use Chrome or Edge.'
      );
      setIsConnecting(false);
      return;
    }

    // Clean up any existing connection first
    if (serialRef.current) {
      try {
        await serialRef.current.disconnect();
      } catch (e) {
        console.warn('Warning: Failed to clean up previous connection:', e);
      }
      serialRef.current = null;
    }

    // Add a small delay to ensure cleanup is complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // Always create a fresh serial instance to avoid port state issues
      const serial: SerialConnection = USE_REAL
        ? new RealSerial()
        : new MockSerial();

      await serial.connect(handleSerialChunk, {
        onDeviceLost: () => {
          if (!isMountedRef.current) return;

          if (sensorUpdateTimeoutRef.current) {
            window.clearTimeout(sensorUpdateTimeoutRef.current);
            sensorUpdateTimeoutRef.current = null;
          }

          serialRef.current = null;
          setIsConnected(false);
          setDeviceReady(false);
          setMacAddress('');
          setSensorData({ waterLevel: null, interval: null });
          registeredMacRef.current = null;
          zeroMacHintPostedRef.current = false;

          pushLog(
            '[Serial] Device lost — USB unplug, cable glitch, or reset after flashing. Click Connect.'
          );
          setConnectionError(
            'Serial device disconnected. If you just uploaded new firmware, connect again.'
          );
        },
      });
      serialRef.current = serial;
      setIsConnected(true);
      pushLog('Connected to ESP32.');

      /* Boot lines often miss the reconnect window — ask sketches that handle GET_INFO. */
      if (USE_REAL) {
        window.setTimeout(() => {
          if (!isMountedRef.current || serialRef.current !== serial) return;
          void serial.send('GET_INFO');
        }, 400);
      }
    } catch (err: any) {
      console.error('Connection error:', err);

      if (err?.name === 'NotFoundError') {
        setConnectionError(
          'No port selected. Please connect the ESP32 and choose a USB port.'
        );
      } else if (
        err?.message?.includes('security') ||
        err?.message?.includes('Permissions')
      ) {
        setConnectionError(
          'Serial permission denied. Please allow access to the USB port.'
        );
      } else {
        setConnectionError(
          `Connection failed: ${err?.message || 'Unknown error'}`
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!serialRef.current) return;

    try {
      await serialRef.current.disconnect();
      pushLog('Disconnected from ESP32.');
    } catch (err) {
      console.error('Disconnect error:', err);
      pushLog('Error while disconnecting.');
    } finally {
      if (sensorUpdateTimeoutRef.current) {
        window.clearTimeout(sensorUpdateTimeoutRef.current);
        sensorUpdateTimeoutRef.current = null;
      }
      serialRef.current = null;
      setIsConnected(false);
      setDeviceReady(false);
      setMacAddress('');
      setSensorData({ waterLevel: null, interval: null });
      registeredMacRef.current = null;
      zeroMacHintPostedRef.current = false;
      setConnectionError(null);
    }
  };

  const sendCommand = async (cmd: string) => {
    setLogs((prev) => {
      const next = [...prev, `> ${cmd}`];
      return next.length > MAX_LOG_LINES
        ? next.slice(next.length - MAX_LOG_LINES)
        : next;
    });

    if (!serialRef.current || !isConnected) {
      setConnectionError('Cannot send commands while disconnected.');
      return;
    }

    try {
      await serialRef.current.send(cmd);
    } catch (err: any) {
      console.error('Send command error:', err);
      setLogs((prev) => {
        const next = [
          ...prev,
          `Error sending command: ${err?.message || 'Unknown error'}`,
        ];
        return next.length > MAX_LOG_LINES
          ? next.slice(next.length - MAX_LOG_LINES)
          : next;
      });
    }
  };

  const connectionStatus = isConnected
    ? deviceReady
      ? 'Ready'
      : 'Connected'
    : 'Disconnected';

  const handleConfirmBarangay = async (barangayId: number) => {
    if (!pendingMacForModal) return;

    setIsSubmittingBarangay(true);
    try {
      const result = await updateSensorBarangay(pendingMacForModal, barangayId);

      if (result.error) {
        pushLog(
          `[ERROR] Failed to update barangay for ${pendingMacForModal}: ${result.error.message}`
        );
      } else {
        pushLog(`Sensor assigned to Barangay ${barangayId}`);
      }
    } finally {
      setIsSubmittingBarangay(false);
      setShowAddSensorModal(false);
      setPendingMacForModal(null);
    }
  };

  return {
    logs,
    isConnected,
    isConnecting,
    connectionError,
    isSupported,
    macAddress,
    deviceReady,
    sensorData,
    connectionStatus,
    connect,
    disconnect,
    sendCommand,
    showAddSensorModal,
    pendingMacForModal,
    handleConfirmBarangay,
    onCancelModal: () => {
      setShowAddSensorModal(false);
      setPendingMacForModal(null);
    },
  };
}
