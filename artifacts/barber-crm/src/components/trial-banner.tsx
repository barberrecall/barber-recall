import { useEffect, useState } from "react";
import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRIAL_DAYS = 3;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function computeTimeLeft(trialStartsAt: string): TimeLeft {
  const endMs = new Date(trialStartsAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const totalMs = Math.max(0, endMs - Date.now());
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, totalMs };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface TrialBannerProps {
  trialStartsAt: string;
  onSubscribe: () => void;
}

export function TrialBanner({ trialStartsAt, onSubscribe }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(trialStartsAt));

  useEffect(() => {
    setTimeLeft(computeTimeLeft(trialStartsAt));
    const id = setInterval(() => {
      setTimeLeft(computeTimeLeft(trialStartsAt));
    }, 1000);
    return () => clearInterval(id);
  }, [trialStartsAt]);

  const isLastDay = timeLeft.days === 0;
  const urgent = isLastDay && timeLeft.hours < 6;

  // Status por valor: só o caso realmente urgente usa a cor de perigo. O
  // aviso "último dia, mas ainda sem pressa" é neutro, não laranja.
  const bgClass = urgent
    ? "bg-destructive/10 border-destructive/20 text-destructive"
    : isLastDay
    ? "bg-muted-foreground/10 border-muted-foreground/20 text-foreground"
    : "bg-primary/10 border-primary/20 text-primary";

  const unitClass = urgent
    ? "bg-destructive/15"
    : isLastDay
    ? "bg-muted-foreground/15"
    : "bg-primary/15";

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b text-xs font-medium ${bgClass}`}>
      {/* Left — icon + countdown */}
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />

        <span className="hidden sm:inline whitespace-nowrap flex-shrink-0">
          {isLastDay ? "Último dia de teste!" : "Teste grátis acaba em:"}
        </span>

        {/* Countdown units */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {timeLeft.days > 0 && (
            <>
              <span className={`${unitClass} rounded px-1.5 py-0.5 tabular-nums font-mono font-bold`}>
                {timeLeft.days}d
              </span>
              <span className="opacity-50">:</span>
            </>
          )}
          <span className={`${unitClass} rounded px-1.5 py-0.5 tabular-nums font-mono font-bold`}>
            {pad(timeLeft.hours)}h
          </span>
          <span className="opacity-50">:</span>
          <span className={`${unitClass} rounded px-1.5 py-0.5 tabular-nums font-mono font-bold`}>
            {pad(timeLeft.minutes)}m
          </span>
          <span className="opacity-50">:</span>
          <span className={`${unitClass} rounded px-1.5 py-0.5 tabular-nums font-mono font-bold`}>
            {pad(timeLeft.seconds)}s
          </span>
        </div>
      </div>

      {/* Right — CTA button */}
      <Button
        size="sm"
        className="flex-shrink-0 h-7 text-xs rounded-full px-3 gap-1"
        onClick={onSubscribe}
      >
        <Zap className="h-3 w-3" />
        Assinar Pro
      </Button>
    </div>
  );
}
