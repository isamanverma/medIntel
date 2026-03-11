"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (page: number) => void;
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onGoTo,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pt-4 border-t border-border",
        className,
      )}
    >
      {/* Range label */}
      <p className="text-xs text-muted-foreground tabular-nums shrink-0">
        {start}–{end} of {totalItems}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-8 items-center justify-center text-xs text-muted-foreground select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="icon"
              className={cn(
                "size-8 text-xs font-medium",
                p === page && "pointer-events-none",
              )}
              onClick={() => onGoTo(p as number)}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
