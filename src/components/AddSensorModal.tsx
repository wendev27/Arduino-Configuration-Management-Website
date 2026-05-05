import React, { useState } from 'react';

type Props = {
  isOpen: boolean;
  macAddress: string;
  onConfirm: (barangayId: number) => Promise<void>;
  onCancel: () => void;
};

export default function AddSensorModal({
  isOpen,
  macAddress,
  onConfirm,
  onCancel,
}: Props) {
  const [barangayId, setBarangayId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(parseInt(barangayId, 10));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold text-white">
          Register New Sensor
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          A new device has been detected. Please assign it to a barangay.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              MAC Address
            </label>
            <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm font-mono text-slate-200">
              {macAddress}
            </div>
          </div>

          <div>
            <label
              htmlFor="barangay"
              className="block text-sm font-medium text-slate-300"
            >
              Barangay ID
            </label>
            <select
              id="barangay"
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
              disabled={isLoading}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 disabled:opacity-60"
            >
              <option value="1">Barangay 1</option>
              <option value="2">Barangay 2</option>
              <option value="3">Barangay 3</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Saving...' : 'Save Sensor'}
          </button>
        </div>
      </div>
    </div>
  );
}
