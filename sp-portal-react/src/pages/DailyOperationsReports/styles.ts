export const dailyOperationsReportsStyles = {
  // Page container
  pageContainer: "font-sans text-slate-800 text-sm",
  pageContent: "w-full min-w-0",
  mainContent: "flex-grow flex flex-col min-w-0",
  desktopMain: "hidden md:block pt-4 sm:pt-5 md:pt-6 space-y-3 sm:space-y-3.5 md:space-y-4 lg:space-y-6",
  mobileMain: "block md:hidden pt-16 pb-20 space-y-2",
  mobileTitle: "text-lg font-bold text-gray-700",
  
  // Filters container — standardized to the same card chrome as
  // Daily Financial Insights' .filters-bar (see daily-operations-reports.css)
  filtersContainer: "dor-filters-card",
  filtersInner: "",
  filtersTogglesContainer: "dor-toggles-row",

  // FilterBar — primeira linha: Period + Export + Search (uma única linha, sem wrap)
  filterBarEmbedded: "dor-filters-row",
  filterBarStandalone: "p-3 sm:p-4 md:p-6 border-b border-gray-200 flex flex-nowrap gap-0 items-center bg-gradient-to-br from-white to-gray-50 rounded-t-lg border border-gray-200 shadow-sm",
  filterBarDateGroup: "dor-filter-group",
  filterBarDateLabel: "filters-label",
  filterBarDateInput: "date-nav-input",
  filterBarSearchGroup: "dor-filter-group",
  filterBarSearchGroupEmbedded: "",
  filterBarSearchGroupStandalone: "",
  filterBarSearchInput: "form-control",
  filterBarActions: "dor-filter-actions",
  
  // FilterToggles (desktop: md+ follows page scale — text-sm, larger padding)
  filterTogglesEmbedded: "flex flex-wrap gap-3 sm:gap-4 md:gap-6 lg:gap-8",
  filterTogglesStandalone: "p-3 sm:p-3.5 md:p-4 md:py-5 px-3 sm:px-4 md:px-6 border-b border-gray-200 flex flex-wrap gap-3 sm:gap-4 md:gap-6 lg:gap-8 bg-gradient-to-br from-white to-gray-50 border-l border-r border-gray-200",
  filterTogglesGroup: "flex flex-col gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5",
  filterTogglesLabel: "text-[10px] sm:text-xs md:text-sm font-semibold uppercase text-gray-500 transition-colors duration-200 hover:text-blue-600",
  filterTogglesButtons: "inline-flex rounded-lg md:rounded-xl overflow-hidden border border-gray-200",
  filterTogglesButton: "px-2 sm:px-2.5 md:px-4 lg:px-4 py-1 sm:py-1.5 md:py-2 lg:py-2 text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200",
  filterTogglesButtonActive: "bg-blue-600 text-white",
  filterTogglesButtonInactive: "bg-white text-gray-700 border-r border-gray-200 last:border-r-0 hover:bg-gray-50 hover:-translate-y-[1px] hover:shadow-md",
  
  // DataTable — standardized to the same .dfi-table-card / .dfi-table look
  // as Daily Financial Insights (see .dor-table* in daily-operations-reports.css)
  dataTableContainer: "dor-table-card",
  dataTableLoadingContainer: "p-4 sm:p-6 md:p-8 text-center",
  dataTableLoadingSpinner: "inline-block animate-spin rounded-full h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 border-b-2 border-indigo-600",
  dataTableLoadingText: "mt-2 text-xs sm:text-sm text-slate-600",
  dataTableScroll: "dor-table-scroll",
  dataTable: "dor-table",
  dataTableEmptyCell: "dor-empty-cell",
  dataTableTotalRow: "dor-totals-row",
  dataTableTotalCell: "",
  dataTableTotalCellCenter: "cursor-help",
  dataTableTotalLabel: "font-normal mr-1 sm:mr-1.5",

  // TableHeader — .dor-table th already styles every <th>, nothing extra needed
  tableHeaderTh: "",
  tableHeaderThSortable: "",
  tableHeaderContent: "flex items-center justify-center gap-0.5 sm:gap-1",
  tableHeaderMultiLine: "flex flex-col items-center justify-center gap-0.5 sm:gap-1",
  tableHeaderSortIcon: "h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4",

  // TableRow — .dor-table tbody tr already handles zebra striping/hover
  tableRow: "",
  tableRowEven: "",
  tableRowOdd: "",
  tableRowHover: "",
  tableCell: "",
  tableCellNormal: "whitespace-normal break-words",
  tableCellVisible: "",
  tableCellRelative: "",
  tableCellRouteContent: "inline-flex items-center gap-1 sm:gap-1.5 justify-center",
  tableCellRouteDot: "shrink-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-gray-300",
  tableCellRouteDotYes: "bg-green-500",
  tableCellRouteDotNo: "bg-red-500",
  tableCellRouteLink: "dor-route-link",
  tableCellVrnWrapper: "flex justify-center",
  
  // Mobile
  mobileFiltersCard: "bg-white rounded-lg p-3 shadow-sm space-y-2",
  mobileFiltersGroup: "space-y-1",
  mobileFiltersLabel: "text-[10px] font-semibold text-gray-500 uppercase",
  mobileFiltersDateGroup: "flex items-center gap-2",
  mobileFiltersDateInput: "flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
  mobileFiltersDateLabel: "text-[10px] text-gray-500",
  mobileFiltersSearchInput: "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100",
  mobileFiltersExportBtn: "!h-8 !min-h-8 !py-1.5 !px-2.5 !text-xs [&_svg]:!size-3",
  mobileFiltersButtons: "flex flex-wrap gap-1",
  mobileFiltersButton: "px-2 py-1 text-[10px] font-medium rounded transition-colors",
  mobileFiltersButtonActive: "bg-blue-600 text-white",
  mobileFiltersButtonInactive: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  mobileViewContainer: "relative",
  mobileViewEmpty: "text-center py-6 text-gray-600 text-xs",
  mobileViewList: "space-y-2 transition-opacity duration-300",
  mobileViewListLoading: "opacity-50",
  mobileViewListLoaded: "opacity-100",
  mobileViewTotals: "bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2",
  mobileViewTotalsRow: "flex justify-between items-center",
  mobileViewTotalsLabel: "text-xs text-gray-500",
  mobileViewTotalsValue: "text-sm font-semibold text-gray-700",
  
  // ErrorAlert
  errorAlertContainer: "mb-3 sm:mb-3.5 md:mb-4 bg-red-50 border border-red-200 text-red-800 px-3 sm:px-3.5 md:px-4 py-2 sm:py-2.5 md:py-3 rounded relative text-xs sm:text-sm",
  errorAlertTitle: "font-bold",
  errorAlertText: "",
} as const;

