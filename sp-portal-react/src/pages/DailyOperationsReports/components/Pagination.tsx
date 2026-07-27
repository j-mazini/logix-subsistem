// @ts-nocheck
import React from 'react';

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface PaginationProps {
  pagination: PaginationState;
  itemsPerPage: number;
  onPageChange: (newPage: number) => void;
  onItemsPerPageChange: (newItemsPerPage: number) => void;
  loading: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading,
}) => {
  if (loading || pagination.totalPages === 0) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const from = pagination.totalItems === 0 ? 0 : (pagination.currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems);

  return (
    <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/60">
      <div className="text-sm text-slate-600">
        Showing <span className="font-medium text-slate-800">{from}</span>-<span className="font-medium text-slate-800">{to}</span> of <span className="font-medium text-slate-800">{pagination.totalItems}</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-xs font-medium text-slate-600">
            Items per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              scrollToTop();
            }}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
        </div>
        <nav aria-label="Pagination">
          <ul className="flex list-none gap-1 m-0 p-0">
            <li>
              <button
                type="button"
                className={`h-8 min-w-[2rem] px-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  pagination.currentPage === 1
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
                }`}
                onClick={() => {
                  onPageChange(pagination.currentPage - 1);
                  scrollToTop();
                }}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 10) {
                pageNum = i + 1;
              } else if (pagination.currentPage <= 5) {
                pageNum = i + 1;
              } else if (pagination.currentPage >= pagination.totalPages - 4) {
                pageNum = pagination.totalPages - 9 + i;
              } else {
                pageNum = pagination.currentPage - 5 + i;
              }
              return (
                <li key={pageNum}>
                  <button
                    type="button"
                    className={`h-8 min-w-[2rem] px-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      pagination.currentPage === pageNum
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                    onClick={() => {
                      onPageChange(pageNum);
                      scrollToTop();
                    }}
                  >
                    {pageNum}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className={`h-8 min-w-[2rem] px-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  pagination.currentPage === pagination.totalPages || pagination.totalPages === 0
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
                }`}
                onClick={() => {
                  onPageChange(pagination.currentPage + 1);
                  scrollToTop();
                }}
                disabled={pagination.currentPage === pagination.totalPages || pagination.totalPages === 0}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

