import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks the state of a media query.
 * @param query - The media query string to watch.
 * @returns `true` if the media query matches, otherwise `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Initial check
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    mediaQueryList.addEventListener('change', listener);

    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
}
