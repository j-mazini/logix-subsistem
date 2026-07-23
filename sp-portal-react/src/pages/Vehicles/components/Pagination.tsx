interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const pages: number[] = [];
  const pageWindow = 2;
  for (let p = Math.max(1, currentPage - pageWindow); p <= Math.min(totalPages, currentPage + pageWindow); p++) {
    pages.push(p);
  }

  return (
    <div className="vp-pagination">
      <span className="vp-pagination-count">
        {totalItems === 0 ? 'No vehicles' : `Showing ${start}–${end} of ${totalItems}`}
      </span>
      <div className="vp-pagination-controls">
        <label className="vp-pagination-perpage">
          Per page
          <select value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <ul className="vp-pagination-nav">
          <li>
            <button type="button" className="vp-pagination-btn" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
              <i className="bi bi-chevron-left" />
            </button>
          </li>
          {pages[0] > 1 && (
            <li>
              <span className="vp-pagination-btn" style={{ cursor: 'default' }}>
                …
              </span>
            </li>
          )}
          {pages.map((p) => (
            <li key={p}>
              <button
                type="button"
                className={`vp-pagination-btn${p === currentPage ? ' vp-active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          ))}
          {pages[pages.length - 1] < totalPages && (
            <li>
              <span className="vp-pagination-btn" style={{ cursor: 'default' }}>
                …
              </span>
            </li>
          )}
          <li>
            <button
              type="button"
              className="vp-pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <i className="bi bi-chevron-right" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
