import React, { useState } from 'react';

type Props = {
  onSend: (cmd: string) => void;
  disabled: boolean;
};

export default function IntervalConfig({ onSend, disabled }: Props) {
  const [interval, setIntervalValue] = useState(1000);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Sensor Interval</h3>
        <p className="mt-1 text-sm text-slate-400">
          Adjust how often the ESP32 reports sensor readings.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="number"
          value={interval}
          onChange={(e) => setIntervalValue(Number(e.target.value))}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
        />
        <button
          type="button"
          onClick={() => onSend(`SET_INTERVAL ${interval}`)}
          disabled={disabled || interval <= 0}
          className="inline-flex items-center justify-center rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Set Interval
        </button>
      </div>
    </div>
  );
}
