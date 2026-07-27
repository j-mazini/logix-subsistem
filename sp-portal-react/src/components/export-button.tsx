// @ts-nocheck
import { useState } from 'react';

export function ExportButton({ label = 'Export', format = 'xlsx', onExport, onError, disabled = false }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!onExport || busy) return;
    setBusy(true);
    try {
      await onExport(format);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Export failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="styled-button styled-button--outline"
    >
      {busy ? 'Exporting…' : label}
    </button>
  );
}

export default ExportButton;
