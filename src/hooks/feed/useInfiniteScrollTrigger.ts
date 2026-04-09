import { useEffect, useRef } from 'react';

interface IUseInfiniteScrollTriggerProps {
  enabled: boolean;
  onLoadMore: () => void;
}

/** 리스트 하단 sentinel이 보이면 다음 페이지를 로드한다. */
export function useInfiniteScrollTrigger(props: IUseInfiniteScrollTriggerProps) {
  const { enabled, onLoadMore } = props;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) onLoadMore();
      },
      { rootMargin: '240px 0px 240px 0px', threshold: 0.01 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, onLoadMore]);

  return sentinelRef;
}
