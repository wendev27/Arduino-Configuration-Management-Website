import React, { useState } from 'react';

type Props = {
  onSend: (cmd: string) => void;
  disabled: boolean;
};

export default function WifiConfig({ onSend, disabled }: Props) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">WiFi Configuration</h3>
        <p className="mt-1 text-sm text-slate-400">
          Send your SSID and password to the ESP32.
        </p>
      </div>

      <div className="space-y-3">
        <input
          placeholder="SSID"
          value={ssid}
          onChange={(e) => setSsid(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
        />
        <button
          type="button"
          onClick={() => onSend(`SET_WIFI ${ssid} ${password}`)}
          disabled={disabled || !ssid || !password}
          className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Apply WiFi
        </button>
      </div>
    </div>
  );
}
