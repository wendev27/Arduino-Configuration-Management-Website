import { useEffect, useRef } from 'react';

type Props = {
  logs: string[];
};

export default function SerialLogs({ logs }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="h-96 overflow-y-auto rounded-3xl border border-slate-800 bg-black/95 p-4 text-sm font-mono text-emerald-300 shadow-inner shadow-slate-950"
    >
      {logs.map((log, index) => (
        <div key={index} className="whitespace-pre-wrap leading-6">
          {log}
        </div>
      ))}
    </div>
  );
}
