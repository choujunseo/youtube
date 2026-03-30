import { useEffect, useMemo, useState } from 'react';

interface IProbabilityGaugeProps {
  probability: number | null;
  /** 투표 직후 등에서 값이 바뀔 때마다 짧은 시각 피드백 */
  celebrateKey?: number;
}

export default function ProbabilityGauge(props: IProbabilityGaugeProps) {
  const { probability, celebrateKey = 0 } = props;
  const target = useMemo(() => {
    if (probability == null) return 0;
    return Math.max(0, Math.min(100, probability));
  }, [probability]);
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setAnimated(target));
    return () => window.cancelAnimationFrame(raf);
  }, [target]);

  const celebrateWrapperKey = celebrateKey > 0 ? `celebrate-${celebrateKey}` : 'celebrate-idle';

  return (
    <div className="space-y-2">
      <div
        key={celebrateWrapperKey}
        className={celebrateKey > 0 ? 'animate-gauge-celebrate' : undefined}
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>내 당첨 확률</span>
          <span className="font-semibold text-blue-700">
            {probability == null ? '-' : `${probability.toFixed(2)}%`}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${animated}%` }}
          />
        </div>
      </div>
    </div>
  );
}
