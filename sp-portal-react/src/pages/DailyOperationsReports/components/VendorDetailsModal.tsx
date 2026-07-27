// @ts-nocheck
import React, { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { TransformedReportData } from '../types';
import { formatDate, formatValue, getTWClass, formatTW, isFlexRoute, calculateWorkHoursWithSort, getDepositNameFromRow } from '../utils';
import { TableCellArrive } from './TableCellArrive';
import { TableCellBreak } from './TableCellBreak';
import { TableCellWorkHours } from './TableCellWorkHours';
import { NoteIcon } from './NoteIcon';
import VrnPlate from '@/components/vrn-plate';
import { hasSortY } from '@/lib/performance-utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { dailyOperationsReportsStyles } from '../styles';

interface VendorDetailsModalProps {
  isOpen: boolean;
  vendorName: string;
  vendorData: TransformedReportData[];
  onClose: () => void;
  totalWorkHoursIncludingSort?: number;
}

function formatTotalWorkHours(hours: number): string {
  if (hours <= 0) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export const VendorDetailsModal = memo<VendorDetailsModalProps>(({
  isOpen,
  vendorName,
  vendorData,
  onClose,
  totalWorkHoursIncludingSort = 0,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calcular total work hours somando apenas os valores workHoursWithSort de cada linha
  // (mesmo valor que aparece na coluna Work Hours da tabela)
  const vendorTotalWorkHours = useMemo(() => {
    let total = 0;
    for (const row of vendorData) {
      const depositName = getDepositNameFromRow(row);
      const workHoursWithSort = calculateWorkHoursWithSort(
        row.workHours,
        row.routeSort,
        depositName
      );
      total += workHoursWithSort;
    }
    return total;
  }, [vendorData]);

  const totals = useMemo(() => {
    const totalStops = vendorData.reduce((sum, row) => sum + (row.stops || 0), 0);
    return {
      totalStops,
      totalRecords: vendorData.length,
    };
  }, [vendorData]);

  useBodyScrollLock(isOpen);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.4
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col pointer-events-auto"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Vendor Details: {vendorName}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {totals.totalRecords} record{totals.totalRecords !== 1 ? 's' : ''} found
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-auto p-6">
                {vendorData.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <p className="text-sm">No records found for this vendor.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                          Total Records
                        </p>
                        <p className="text-2xl font-bold text-blue-900">{totals.totalRecords}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                          Total Stops
                        </p>
                        <p className="text-2xl font-bold text-green-900">{totals.totalStops}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                          Total Work Hours
                        </p>
                        <p className="text-2xl font-bold text-purple-900">
                          {formatTotalWorkHours(vendorTotalWorkHours)}
                        </p>
                      </div>
                    </div>

                    {/* Columns Layout - Data Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {vendorData.map((row, index) => (
                        <motion.div
                          key={`${row.date}-${row.route}-${row.vrn}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 space-y-3"
                        >
                          {/* Header */}
                          <div className="border-b border-gray-200 pb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Date
                              </span>
                              <span className="text-sm font-medium text-slate-900">
                                {formatDate(row.date)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Route
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className={`shrink-0 w-2 h-2 rounded-full border border-gray-300 ${hasSortY(row.routeSort) ? 'bg-green-500' : 'bg-red-500'}`}
                                  title={hasSortY(row.routeSort) ? 'Sort: Yes' : 'Sort: No'}
                                />
                                <span className="text-sm font-medium text-blue-600">
                                  {isFlexRoute(row.route) && !row.route.trim().toUpperCase().startsWith('FLEX')
                                    ? `Flex ${row.route}`
                                    : row.route}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Vehicle Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">VRN:</span>
                              <VrnPlate vrn={row.vrn} size="sm" showBadge={false} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Depot:</span>
                              <span className="text-sm font-medium text-slate-700">{row.depot || '---'}</span>
                            </div>
                          </div>

                          {/* Time Information */}
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Depart:</span>
                              <span className="text-sm font-medium text-slate-700">
                                {formatValue(row.depart) || '---'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Arrive:</span>
                              <span className="text-sm font-medium">
                                <TableCellArrive
                                  arrive={row.arrive}
                                  route={row.route}
                                  depot={row.depot}
                                />
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Break:</span>
                              <span className="text-sm font-medium">
                                <TableCellBreak breakTime={row.breakTime} />
                              </span>
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">TW (%):</span>
                              <span className={`text-sm font-medium ${getTWClass(row.tw)}`}>
                                {row.tw !== null && row.tw !== undefined ? formatTW(row.tw) : '---'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Work Hours:</span>
                              <span className="text-sm font-medium">
                                <TableCellWorkHours
                                  workHours={row.workHours}
                                  workHoursWithSort={row.workHoursWithSort}
                                  depart={row.depart}
                                  arrive={row.arrive}
                                  routeSort={row.routeSort}
                                  route={row.route}
                                  totalWorkHoursIncludingSort={vendorTotalWorkHours}
                                />
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Stops:</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {formatValue(row.stops) || '0'}
                              </span>
                            </div>
                          </div>

                          {/* Note */}
                          {row.note && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs text-slate-500">Note:</span>
                                <div className="flex-1 text-right">
                                  <NoteIcon note={row.note} />
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
});

VendorDetailsModal.displayName = 'VendorDetailsModal';

