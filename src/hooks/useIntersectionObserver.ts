import { RefObject, useEffect, useState } from 'react';

interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

/**
 * Hook que observa la visibilidad de un elemento en el viewport mediante
 * el API IntersectionObserver para habilitar carga diferida (lazy loading).
 */
export function useIntersectionObserver<T extends Element>(
  targetRef: RefObject<T | null>,
  {
    root = null,
    rootMargin = '80px 0px',
    threshold = 0.05,
    triggerOnce = true,
  }: UseIntersectionObserverOptions = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    if (triggerOnce && isIntersecting) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            if (triggerOnce) {
              observer.unobserve(entry.target);
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            setIsIntersecting(false);
          }
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, root, rootMargin, threshold, triggerOnce, isIntersecting]);

  return isIntersecting;
}
