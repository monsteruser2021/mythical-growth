"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export const PAGE_SIZE_OPTIONS = [8, 16, 24] as const;

export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  return { pageItems, pageSize, currentPage, pageCount, setPage, changePageSize };
}

type PaginationControlsProps = {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label: string;
};

export default function PaginationControls({
  currentPage,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  label,
}: PaginationControlsProps) {
  if (totalItems === 0) return null;
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav aria-label={`Paginación de ${label}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p aria-live="polite" className="text-xs text-slate-400">
        Mostrando {firstItem}–{lastItem} de {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <span>Por página</span>
          <select
            aria-label={`Cantidad por página de ${label}`}
            className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-sm text-slate-200"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button
          aria-label="Página anterior"
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </button>
        <span className="min-w-16 text-center text-xs tabular-nums text-slate-400">
          {currentPage} / {pageCount}
        </span>
        <button
          aria-label="Página siguiente"
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </nav>
  );
}
