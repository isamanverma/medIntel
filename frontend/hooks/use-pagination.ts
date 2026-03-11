import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  hasNext: boolean;
  hasPrev: boolean;
  goTo: (page: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

export function usePagination<T>(
  items: T[],
  { pageSize = 10, initialPage = 1 }: UsePaginationOptions = {},
): UsePaginationResult<T> {
  const [page, setPage] = useState(initialPage);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // If the source list shrinks (e.g. after a filter/delete) and the current
  // page no longer exists, clamp back to the last valid page.
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goTo = useCallback(
    (target: number) => {
      setPage(Math.max(1, Math.min(target, totalPages)));
    },
    [totalPages],
  );

  const next = useCallback(() => goTo(safePage + 1), [safePage, goTo]);
  const prev = useCallback(() => goTo(safePage - 1), [safePage, goTo]);
  const reset = useCallback(() => setPage(initialPage), [initialPage]);

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems: items.length,
    pageItems,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    goTo,
    next,
    prev,
    reset,
  };
}
