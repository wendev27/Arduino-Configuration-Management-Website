type Props = {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  isSupported: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

export default function ConnectControls({
  isConnected,
  isConnecting,
  connectionError,
  isSupported,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <div className="space-y-4">
      {!isSupported ? (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
          Web Serial API not supported. Please use Chrome or Edge.
        </div>
      ) : !isConnected ? (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? 'Connecting…' : 'Connect to ESP32'}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={onDisconnect}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-6 py-3 text-white transition hover:bg-rose-400"
          >
            Disconnect
          </button>
          <div className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-300">
            💡 Disconnect before refreshing or closing the page.
          </div>
        </div>
      )}

      {connectionError && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          {connectionError}
        </div>
      )}
    </div>
  );
}
