'use client';

import { useOfficer } from '../context/OfficerContext';

export function OfficerSelector() {
  const { selectedOfficer, setSelectedOfficer, officers, isOfficerSelected } = useOfficer();

  return (
    <div className="officer-selector" role="region" aria-label="Officer selector">
      <label htmlFor="officer-select" className="officer-label">
        Current Officer:
      </label>
      <select
        id="officer-select"
        value={selectedOfficer || ''}
        onChange={(e) => setSelectedOfficer(e.target.value)}
        className={`officer-select ${isOfficerSelected ? 'selected' : 'not-selected'}`}
        aria-describedby="officer-help"
      >
        <option value="">Select your name...</option>
        {officers.map((officer) => (
          <option key={officer} value={officer}>
            {officer}
          </option>
        ))}
      </select>
      <span id="officer-help" className="officer-help">
        {isOfficerSelected
          ? `Actions logged as: ${selectedOfficer}`
          : 'Please select before proceeding (demo only, not authenticated)'}
      </span>

      <style>{`
        .officer-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .officer-label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
        }

        .officer-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          min-width: 180px;
          transition: border-color 0.2s;
        }

        .officer-select:hover {
          border-color: #999;
        }

        .officer-select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        }

        .officer-select.selected {
          border-color: #66bb6a;
          background: #f1f8f4;
        }

        .officer-select.not-selected {
          border-color: #ff6b6b;
          background: #fff5f5;
        }

        .officer-help {
          font-size: 12px;
          color: #666;
          font-style: italic;
          flex: 1;
          min-width: 200px;
        }

        @media (max-width: 768px) {
          .officer-selector {
            flex-direction: column;
            align-items: flex-start;
          }

          .officer-select {
            width: 100%;
            min-width: unset;
          }

          .officer-help {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
