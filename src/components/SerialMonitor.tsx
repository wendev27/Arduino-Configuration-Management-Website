'use client';

import { useSerial } from '../hooks/useSerial';
import ConnectControls from './ConnectControls';
import DeviceInfo from './DeviceInfo';
import SensorDisplay from './SensorDisplay';
import ConfigPanel from './ConfigPanel';
import SerialLogs from './SerialLogs';
import AddSensorModal from './AddSensorModal';

export default function SerialMonitor() {
  const {
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
    onCancelModal,
  } = useSerial();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              ESP32 IoT Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Arduino Control Panel
            </h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Connect to your ESP32 over USB, monitor real-time sensor data, and
              send commands through a modern dashboard.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <ConnectControls
                isConnected={isConnected}
                isConnecting={isConnecting}
                connectionError={connectionError}
                isSupported={isSupported}
                onConnect={connect}
                onDisconnect={disconnect}
              />
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">
                Connection status
              </div>
              <div className="mt-4 text-2xl font-semibold text-white">
                {connectionStatus}
              </div>
              <div className="mt-3 text-sm text-slate-400">
                USB serial, baud rate 9600, Chrome/Edge only.
              </div>
              {connectionError && (
                <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {connectionError}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <DeviceInfo
                isConnected={isConnected}
                isReady={deviceReady}
                macAddress={macAddress}
                statusLabel={connectionStatus}
              />
              <SensorDisplay
                waterLevel={sensorData.waterLevel}
                interval={sensorData.interval}
              />
            </div>

            <ConfigPanel onSend={sendCommand} disabled={!isConnected} />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    Serial Monitor
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Live logs
                  </h2>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
                  {logs.length} lines
                </span>
              </div>
              <div className="mt-6">
                <SerialLogs logs={logs} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddSensorModal
        isOpen={showAddSensorModal}
        macAddress={pendingMacForModal || ''}
        onConfirm={handleConfirmBarangay}
        onCancel={onCancelModal}
      />
    </div>
  );
}
