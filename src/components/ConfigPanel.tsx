import ControlButtons from './ControlButtons';
import IntervalConfig from './IntervalConfig';
import WifiConfig from './WifiConfig';

type Props = {
  onSend: (cmd: string) => void;
  disabled: boolean;
};

export default function ConfigPanel({ onSend, disabled }: Props) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Configuration
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">
          Device commands
        </h3>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-900/90 p-5">
            <WifiConfig onSend={onSend} disabled={disabled} />
          </div>
          <div className="rounded-2xl bg-slate-900/90 p-5">
            <IntervalConfig onSend={onSend} disabled={disabled} />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/90 p-5">
          <ControlButtons onSend={onSend} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}
