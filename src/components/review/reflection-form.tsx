"use client";

import { useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveWeeklyReview } from "@/server/actions/review";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FIELDS = [
  {
    key: "wentWell",
    label: "Was lief gut?",
    placeholder: "Worauf bist du stolz? Was hat funktioniert?",
  },
  {
    key: "toImprove",
    label: "Was möchtest du verbessern?",
    placeholder: "Was lief nicht rund? Was würdest du anders machen?",
  },
  {
    key: "focusNext",
    label: "Fokus für nächste Woche",
    placeholder: "Eine konkrete Sache, auf die es nächste Woche ankommt.",
  },
] as const;

type Values = Record<(typeof FIELDS)[number]["key"], string>;

export function ReflectionForm({
  weekStart,
  initial,
}: {
  weekStart: string;
  initial?: { wentWell?: string; toImprove?: string; focusNext?: string };
}) {
  const [values, setValues] = useState<Values>({
    wentWell: initial?.wentWell ?? "",
    toImprove: initial?.toImprove ?? "",
    focusNext: initial?.focusNext ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(next: Values) {
    startTransition(async () => {
      await saveWeeklyReview({ weekStart, ...next });
      setSaved(true);
    });
  }

  function onChange(key: keyof Values, val: string) {
    const next = { ...values, [key]: val };
    setValues(next);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 800);
  }

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor={`rf-${f.key}`}>
            {f.label}
          </label>
          <Textarea
            id={`rf-${f.key}`}
            value={values[f.key]}
            onChange={(e) => onChange(f.key, e.target.value)}
            onBlur={() => save(values)}
            placeholder={f.placeholder}
            maxLength={2000}
            rows={3}
            className="text-sm"
          />
        </div>
      ))}
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs transition-opacity",
          saved && !pending ? "text-emerald-500 opacity-100" : "opacity-0",
        )}
        aria-live="polite"
      >
        <Check className="size-3.5" aria-hidden />
        Gespeichert
      </p>
    </div>
  );
}
