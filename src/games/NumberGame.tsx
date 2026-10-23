import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, PrimaryButton, Row, ScreenHeader, Segmented, Toggle } from "../components/ui";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { randomInt, shuffle } from "../utils/random";

type NumberHistoryEntry = {
  sequence: number;
  numbers: number[];
  generatedAt: number;
};

const HISTORY_STORAGE_KEY = "chooser.number-history.v1";

function loadNumberHistory(): NumberHistoryEntry[] {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new Error("Saved number history is not a list.");
    }
    return parsed.filter(
      (entry): entry is NumberHistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        "sequence" in entry &&
        Number.isInteger(entry.sequence) &&
        entry.sequence > 0 &&
        "numbers" in entry &&
        Array.isArray(entry.numbers) &&
        entry.numbers.every(Number.isSafeInteger) &&
        "generatedAt" in entry &&
        Number.isFinite(entry.generatedAt),
    );
  } catch (error) {
    console.error("Unable to load saved number history.", error);
    return [];
  }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[13px] font-semibold tracking-wide text-label/70 uppercase">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const n = parseInt(text, 10);
          if (Number.isFinite(n)) onChange(Math.max(-99999, Math.min(99999, n)));
          else setText(String(value));
        }}
        className="w-28 rounded-2xl bg-white/50 py-2.5 text-center text-[24px] font-bold text-label outline-none focus:bg-white/80"
      />
    </label>
  );
}

export function NumberGame({ onBack }: { onBack: () => void }) {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(1);
  const [unique, setUnique] = useState(true);
  const [results, setResults] = useState<number[]>([]);
  const [history, setHistory] = useState<NumberHistoryEntry[]>(loadNumberHistory);
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Unable to save number history.", error);
    }
  }, [history]);

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const rangeSize = hi - lo + 1;
  const canUnique = rangeSize >= count;

  const finalNumbers = () => {
    if (unique && canUnique) {
      if (rangeSize <= 5000) {
        const all = Array.from({ length: rangeSize }, (_, i) => lo + i);
        return shuffle(all).slice(0, count);
      }
      const set = new Set<number>();
      while (set.size < count) set.add(randomInt(lo, hi));
      return [...set];
    }
    return Array.from({ length: count }, () => randomInt(lo, hi));
  };

  const generate = () => {
    if (rolling) return;
    setRolling(true);
    feedback.tap();
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setResults(Array.from({ length: count }, () => randomInt(lo, hi)));
          setTick((t) => t + 1);
          if (i % 2 === 0) feedback.tick();
        }, i * 55),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        const generatedNumbers = finalNumbers();
        setResults(generatedNumbers);
        setHistory((current) => [
          {
            sequence: Math.max(0, ...current.map((entry) => entry.sequence)) + 1,
            numbers: generatedNumbers,
            generatedAt: Date.now(),
          },
          ...current,
        ]);
        setTick((t) => t + 1);
        setRolling(false);
        feedback.thud();
      }, steps * 55 + 40),
    );
  };

  const big = results.length <= 1;

  return (
    <div className="scroll-y absolute inset-0">
      <ScreenHeader title="Number" onBack={onBack} backLabel="Games" />
      <div className="space-y-4 px-6 pb-10">
        <Card className="flex min-h-[200px] items-center justify-center px-6 py-8">
          {results.length === 0 ? (
            <span className="text-[96px] leading-none font-bold tracking-tight text-white/55">
              00
            </span>
          ) : (
            <div
              className={cn(
                "flex flex-wrap items-center justify-center gap-3",
                big ? "" : "max-w-full",
              )}
            >
              {results.map((n, i) => (
                <span
                  key={`${tick}-${i}`}
                  className={cn(
                    "anim-number-roll font-extrabold tracking-tight text-white drop-shadow",
                    big
                      ? "text-[96px] leading-none"
                      : "min-w-[64px] rounded-2xl bg-white/25 px-3 py-2 text-center text-[32px] leading-none",
                  )}
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card className="px-5 py-5">
          <div className="flex items-center justify-center gap-4">
            <NumberField label="Min" value={min} onChange={setMin} />
            <span className="mt-5 text-2xl font-bold text-label/50">–</span>
            <NumberField label="Max" value={max} onChange={setMax} />
          </div>
        </Card>

        <Card>
          <div className="divide-y divide-white/25">
            <Row label="Amount" hint="How many numbers">
              <Segmented<number>
                value={count}
                onChange={setCount}
                options={[1, 2, 3, 5, 10].map((v) => ({ value: v, label: String(v) }))}
                className="w-[210px]"
              />
            </Row>
            <Row
              label="No duplicates"
              hint={canUnique ? "Each number appears once" : "Range too small for that"}
            >
              <Toggle checked={unique && canUnique} onChange={setUnique} label="No duplicates" />
            </Row>
          </div>
        </Card>

        <div className="flex justify-center pt-2">
          <PrimaryButton onClick={generate} disabled={rolling} className="w-full max-w-xs">
            {rolling ? "Generating…" : "Generate"}
          </PrimaryButton>
        </div>

        <Card className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Number history</h2>
              <p className="text-xs text-white/70">Saved on this device</p>
            </div>
            <button
              type="button"
              disabled={history.length === 0}
              onClick={() => setHistory([])}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 size={16} />
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-white/70">Generated numbers will appear here.</p>
          ) : (
            <ol className="mt-3 divide-y divide-white/15">
              {history.map((entry) => (
                <li
                  key={entry.sequence}
                  className="flex items-center justify-between gap-3 py-3 text-sm text-white"
                >
                  <span className="shrink-0 font-bold text-white/70">#{entry.sequence}</span>
                  <span className="min-w-0 flex-1 text-right font-semibold">
                    {entry.numbers.join(", ")}
                  </span>
                  <time
                    className="shrink-0 text-xs text-white/60"
                    dateTime={new Date(entry.generatedAt).toISOString()}
                  >
                    {new Date(entry.generatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
