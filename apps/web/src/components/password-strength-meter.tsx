"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const STRENGTH_LEVELS = [
  { label: "Sangat lemah", minScore: 0, color: "bg-destructive" },
  { label: "Lemah", minScore: 1, color: "bg-orange-500" },
  { label: "Cukup", minScore: 2, color: "bg-yellow-500" },
  { label: "Kuat", minScore: 3, color: "bg-emerald-500" },
];

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

function calculateScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;
  return Math.min(score, STRENGTH_LEVELS.length - 1);
}

export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const { level, score } = useMemo(() => {
    if (!password) {
      return { level: STRENGTH_LEVELS[0], score: 0 };
    }

    const computedScore = calculateScore(password);
    let matchedLevel = STRENGTH_LEVELS[0];
    for (const strengthLevel of STRENGTH_LEVELS) {
      if (computedScore >= strengthLevel.minScore) {
        matchedLevel = strengthLevel;
      }
    }

    return { level: matchedLevel, score: computedScore + 1 };
  }, [password]);

  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        {Array.from({ length: STRENGTH_LEVELS.length }).map((_, index) => (
          <div
            key={index}
            className={cn("flex-1 transition-colors", {
              [level.color]: index < score,
            })}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Kekuatan password: <span className="font-medium text-foreground">{level.label}</span>
      </p>
    </div>
  );
}
