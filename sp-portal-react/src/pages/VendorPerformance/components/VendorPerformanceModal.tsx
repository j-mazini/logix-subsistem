import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import {
  buildKpiCards,
  calculateAFD,
  calculateAverages,
  formatMonthYear,
  formatMonthYearShort,
  getTimeWindowClass,
  WEEKDAYS,
  type DayRecord,
  type MonthKey,
  type OperationLike,
  type Vendor,
} from '../VendorPerformance';

/* =====================================================
   VendorPerformanceModal — ported from the Next.js source's
   components/PerformanceModal.tsx (full-screen vendor performance view,
   opened from a vendors list instead of navigating away from the current
   filters). Reuses the exact same mock-data helpers (buildKpiCards,
   calculateAverages, calculateAFD) as the inline detail view so the numbers
   always match.
   ===================================================== */

interface VendorPerformanceModalProps {
  vendor: Vendor | null;
  months: MonthKey[];
  getMonthData: (vendorId: number, year: number, month: number) => DayRecord[];
  onClose: () => void;
  onDayClick: (vendorLabel: string, monthLabel: string, day: DayRecord) => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.4 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

function twBadgeClass(tw: string): string {
  if (tw === '--:--' || tw === 'N/A') return 'text-slate-400 italic';
  const band = getTimeWindowClass(parseFloat(tw));
  switch (band) {
    case 'success': return 'text-green-600 font-semibold';
    case 'warning': return 'text-amber-600 font-semibold';
    case 'orange': return 'text-orange-600 font-semibold';
    case 'danger': return 'text-red-600 font-semibold';
    default: return 'text-slate-400 italic';
  }
}

export function VendorPerformanceModal({ vendor, months, getMonthData, onClose, onDayClick }: VendorPerformanceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<MonthKey | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset / default to the most recent month with data whenever a new vendor opens.
  useEffect(() => {
    if (vendor && months.length > 0) {
      setSelected(months[months.length - 1]);
    } else {
      setSelected(null);
    }
  }, [vendor, months]);

  useBodyScrollLock(!!vendor);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && vendor) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [vendor, onClose]);

  const monthData = useMemo(() => {
    if (!vendor || !selected) return [];
    return getMonthData(vendor.id, selected.year, selected.month);
  }, [vendor, selected, getMonthData]);

  const stats = useMemo(() => calculateAverages(monthData), [monthData]);
  const kpiCards = useMemo(() => buildKpiCards(stats, false), [stats]);

  const daysWithData = useMemo(
    () => monthData.filter((d) => !(d.route === 'N/A' && d.spr === 'N/A' && d.sporH === 'N/A' && d.tw === 'N/A')).slice().reverse(),
    [monthData],
  );

  if (!mounted) return null;

  const monthLabel = selected ? formatMonthYear(selected.year, selected.month) : '';

  const modalContent = (
    <AnimatePresence>
      {vendor && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1050]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[1055] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col pointer-events-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    {vendor?.firstName} {vendor?.lastName} &ndash; Performance
                  </h2>
                  {vendor?.email && <p className="text-sm text-slate-500 mt-0.5">{vendor.email}</p>}
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-5 sm:p-6 space-y-5">
                {months.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <p className="text-sm font-medium">No records for this vendor</p>
                    <p className="text-xs mt-1">This vendor has no performance data in the last 12 months.</p>
                  </div>
                ) : (
                  <>
                    {/* Month carousel */}
                    <div className="flex overflow-x-auto gap-2 pb-1">
                      {months.map((m) => {
                        const active = selected?.year === m.year && selected?.month === m.month;
                        return (
                          <button
                            key={`${m.year}-${m.month}`}
                            type="button"
                            onClick={() => setSelected(m)}
                            className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors border flex-shrink-0 ${
                              active
                                ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                                : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {formatMonthYearShort(m.year, m.month)}
                          </button>
                        );
                      })}
                    </div>

                    {/* KPI tiles */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
                      <h3 className="text-sm font-semibold text-slate-800 mb-3">{monthLabel} Performance</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {kpiCards.map((c) => (
                          <div key={c.key} className="rounded-lg border border-gray-200 p-3">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
                            <p className="text-xl font-bold text-slate-900 mt-1">{c.isNA ? '–' : c.value}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.sublabel}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Daily breakdown table */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b-2 border-blue-600">
                        <h3 className="text-sm font-bold text-slate-800">Daily Breakdown</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click a row to see full day details.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              {['Day', 'Route', 'SPR', 'SPOR-H', 'TW', 'AFD'].map((h) => (
                                <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {daysWithData.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-6 text-xs text-slate-400 italic">
                                  No data available for this month.
                                </td>
                              </tr>
                            ) : (
                              daysWithData.map((d, idx) => {
                                const sprIsNA = d.spr === 'N/A' || d.spr === 0;
                                let afdDisplay = '--:--';
                                if (!sprIsNA) {
                                  const op: OperationLike = {
                                    deliveryDetails: {
                                      paidStops: { pu: d.pu ?? 0, ok: d.ok ?? 0, hn: d.hn ?? 0, pd: d.pd ?? 0 },
                                      unpaidStops: { nr: d.nr ?? 0, fp: d.fp ?? 0, rd: 0, ba: d.ba ?? 0, nh: d.nh ?? 0, cm: d.cm ?? 0, ca: d.ca ?? 0 },
                                      departTime: null,
                                      arriveTime: null,
                                    },
                                    dailyMetrics: { breakMinutes: 0 },
                                  };
                                  const afdVal = calculateAFD(op);
                                  if (!isNaN(afdVal) && afdVal >= 0) afdDisplay = `${afdVal}%`;
                                }
                                return (
                                  <tr
                                    key={`${d.day}-${idx}`}
                                    className="border-b border-gray-100 hover:bg-blue-50/60 cursor-pointer transition-colors"
                                    onClick={() => selected && onDayClick(`${vendor?.firstName} ${vendor?.lastName}`, formatMonthYear(selected.year, selected.month), d)}
                                  >
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <strong>{String(d.day).padStart(2, '0')}</strong>{' '}
                                      <span className="text-[10px] text-slate-400 uppercase">{WEEKDAYS[d.dayOfWeek]}</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">{d.route === 'N/A' ? <span className="text-slate-400 italic">--:--</span> : d.route}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{sprIsNA ? <span className="text-slate-400 italic">--:--</span> : d.spr}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{d.sporH === 'N/A' || d.sporH === '0.0' ? <span className="text-slate-400 italic">--:--</span> : d.sporH}</td>
                                    <td className={`px-3 py-2 whitespace-nowrap ${twBadgeClass(d.tw)}`}>{d.tw === 'N/A' || d.tw === '0.0%' ? '--:--' : d.tw}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{afdDisplay}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
