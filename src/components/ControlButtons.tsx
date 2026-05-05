type Props = {
  onSend: (cmd: string) => void;
  disabled: boolean;
};

export default function ControlButtons({ onSend, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => onSend('START')}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Start
      </button>
      <button
        type="button"
        onClick={() => onSend('STOP')}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Stop
      </button>
    </div>
  );
}
