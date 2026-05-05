type Props = {
  isConnected: boolean;
  isReady: boolean;
  macAddress: string;
  statusLabel: string;
};

export default function DeviceInfo({
  isConnected,
  isReady,
  macAddress,
  statusLabel,
}: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Device Info
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            ESP32 Status
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            isConnected
              ? isReady
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                : 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/10'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-4 text-sm text-slate-300">
        <div className="rounded-2xl bg-slate-900/90 p-4">
          <div className="text-xs uppercase text-slate-500">Connection</div>
          <div className="mt-2 text-lg font-medium text-white">
            {isConnected ? 'Connected via USB' : 'Disconnected'}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/90 p-4">
          <div className="text-xs uppercase text-slate-500">MAC Address</div>
          <div className="mt-2 text-lg font-medium text-white">
            {macAddress || 'Unknown'}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/90 p-4">
          <div className="text-xs uppercase text-slate-500">Device Ready</div>
          <div className="mt-2 text-lg font-medium text-white">
            {isReady ? 'Ready for commands' : 'Waiting for boot'}
          </div>
        </div>
      </div>
    </div>
  );
}
