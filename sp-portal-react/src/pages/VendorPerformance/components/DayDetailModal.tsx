import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { X, Clock, MapPin, TrendingUp } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { calculateAFD, WEEKDAYS, type DayRecord, type OperationLike } from '../VendorPerformance';

/* =====================================================
   DayDetailModal — ported from the Next.js source's
   components/OverviewModal.tsx ("Operations Overview" modal).

   The source component lists every raw operation for a vendor/day fetched
   from the backend. This app's mock model only produces a single aggregated
   "operation" per weekday (see generateMonthData in VendorPerformance.tsx),
   so this port adapts the same idea — a focused, full-detail popup reached
   by clicking a daily-breakdown row — to that one-operation-per-day shape
   instead of inventing a fake multi-operation list.
   ===================================================== */

export interface DayDetailTarget {
  vendorLabel: string;
  monthLabel: string;
  day: DayRecord;
}

interface DayDetailModalProps {
  target: DayDetailTarget | null;
  onClose: () => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.35 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}

export function DayDetailModal({ target, onClose }: DayDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(!!target);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && target) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [target, onClose]);

  if (!mounted) return null;

  const d = target?.day;
  let afdDisplay = '--:--';
  if (d) {
    const sprIsNA = d.spr === 'N/A' || d.spr === 0;
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
  }

  const modalContent = (
    <AnimatePresence>
      {target && d && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1060]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[1065] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{target.vendorLabel}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {WEEKDAYS[d.dayOfWeek]} {String(d.day).padStart(2, '0')} &middot; {target.monthLabel}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Route <strong className="text-slate-900">{d.route === 'N/A' ? '--:--' : d.route}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600" />
                    {d.departTime && d.arriveTime ? `${d.departTime} → ${d.arriveTime}` : '--:--'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <StatBlock label="SPR" value={d.spr === 'N/A' ? '--:--' : d.spr} />
                  <StatBlock label="SPOR-H" value={d.sporH === 'N/A' ? '--:--' : d.sporH} />
                  <StatBlock label="TW" value={d.tw === 'N/A' ? '--:--' : d.tw} />
                  <StatBlock label="AFD" value={afdDisplay} />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2 inline-flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Paid stops
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    {([['PU', d.pu], ['OK', d.ok], ['HN', d.hn], ['PD', d.pd]] as const).map(([label, value]) => (
                      <div key={label} className="rounded-md bg-green-50 border border-green-100 py-2">
                        <p className="text-[10px] text-green-700 font-semibold">{label}</p>
                        <p className="text-sm font-bold text-green-900">{value ?? 0}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Unpaid / failed stops</p>
                  <div className="grid grid-cols-6 gap-1.5 text-center text-sm">
                    {([['NR', d.nr], ['FP', d.fp], ['BA', d.ba], ['NH', d.nh], ['CM', d.cm], ['CA', d.ca]] as const).map(([label, value]) => (
                      <div key={label} className="rounded-md bg-red-50 border border-red-100 py-2">
                        <p className="text-[10px] text-red-700 font-semibold">{label}</p>
                        <p className="text-sm font-bold text-red-900">{value ?? 0}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {d.workedHours && (
                  <p className="text-xs text-slate-500">Worked hours: <strong className="text-slate-800">{d.workedHours}h</strong></p>
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
