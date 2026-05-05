type Props = {
  waterLevel: number | null;
  interval: number | null;
};

export default function SensorDisplay({ waterLevel, interval }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Sensor Display
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Water Level & Interval
          </h3>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-900/90 p-6">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Water Level
          </div>
          <div className="mt-4 text-5xl font-semibold text-emerald-300">
            {waterLevel !== null ? `${waterLevel}%` : '--'}
          </div>
          <div className="mt-2 text-sm text-slate-400">Live sensor reading</div>
        </div>

        <div className="rounded-2xl bg-slate-900/90 p-6">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Interval
          </div>
          <div className="mt-4 text-5xl font-semibold text-sky-300">
            {interval !== null ? `${interval} ms` : '--'}
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Current update cadence
          </div>
        </div>
      </div>
    </div>
  );
}
