import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw, Wallet, Calendar, CalendarDays, LayoutGrid, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/Alert";
import { Button } from "./components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/Dialog";
import { Label } from "./components/ui/Label";
import { MonthPicker } from "./components/ui/MonthPicker";
import NavbarWrapper from "@/components/navbar-wrapper";
import { DgpPageFrame, MobilePageShell, StandardPageLayout } from "@/app/(private)/components";
import { ModernPageHeader } from "@/components/modern-page-header";
import {
  fetchVendorRequests,
  approveVendorRequestWithoutDayOffInsert,
  rejectVendorRequest,
  fetchVendors,
  type VendorRequest,
} from "@/lib/vendor-requests-api";
import { useServicePartners } from "@/hooks/useServicePartners";
import type { AdminRequest, AdvanceRequest, DayOffOrHolidayRequest } from "./types";
import { isAdvance, requestTypeLabel, normalizeStatus } from "./types";
import { RequestDetailModal } from "./components/RequestDetailModal";
import { VendorsOffModal } from "./components/VendorsOffModal";

/**
 * Generates a reference number for PrePayment deductions
 * Format: PRP-INITIALS-DDMMYY-SEQ
 */
function generatePrePaymentReferenceNumber(vendorName: string, vendorRequestId: number): string {
  const prefix = "PRP";

  let cleanName = vendorName.trim();
  if (cleanName.startsWith("#")) {
    cleanName = cleanName.substring(1).trim();
  }
  if (cleanName.toLowerCase().startsWith("vendor")) {
    cleanName = cleanName.substring(6).trim();
  }

  const nameParts = cleanName.split(/\s+/).filter(part => part.length > 0 && /[a-zA-Z]/.test(part));
  let initials = "";
  if (nameParts.length > 0) {
    const firstName = nameParts[0];
    const lastNames = nameParts.length > 1 ? nameParts.slice(1).join("") : "";
    initials = (firstName.charAt(0).toUpperCase() + lastNames.toUpperCase()).replace(/[^A-Z]/g, "");
  }

  if (!initials || initials.length === 0) {
    initials = `VND${vendorRequestId}`;
  }

  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;

  const seq = String(vendorRequestId).padStart(3, "0");

  return `${prefix}-${initials}-${dateStr}-${seq}`;
}

function getRequestMonthKey(r: AdminRequest): string {
  const createdAt = r.createdAt;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function groupRequestsByMonth(requests: AdminRequest[]): [string, AdminRequest[]][] {
  const map = new Map<string, AdminRequest[]>();
  for (const r of requests) {
    const key = getRequestMonthKey(r);
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

function vendorRequestToAdminRequest(r: VendorRequest): AdminRequest {
  const requestTypeLower = String(r.requestType ?? "").toLowerCase().replace(/[_\s]/g, "");
  const isPrePayment = requestTypeLower === "prepayment";

  if (isPrePayment) {
    const status = normalizeStatus(r.status);
    return {
      type: "advance",
      id: r.vendorRequestId,
      userId: r.userId,
      amount: Number(r.prePaymentValue || 0),
      reason: r.reason,
      notes: r.notes,
      status: status as AdvanceRequest["status"],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  } else {
    const status = normalizeStatus(r.status);
    const createdDateOnly = r.createdAt ? String(r.createdAt).split("T")[0] : "";
    const startDateRaw = r.startDate != null && String(r.startDate).trim() !== "" ? String(r.startDate).trim() : "";
    const startDate = startDateRaw ? startDateRaw.split("T")[0] : createdDateOnly;
    const endDateRaw = r.endDate != null && String(r.endDate).trim() !== "" ? String(r.endDate).trim() : "";
    const endDate = endDateRaw ? endDateRaw.split("T")[0] : (startDate || createdDateOnly);
    const isDayOff = requestTypeLower === "dayoff";
    return {
      type: isDayOff ? "day_off" : "holiday",
      id: String(r.vendorRequestId),
      userId: r.userId,
      startDate: startDate || "",
      endDate: endDate || startDate || "",
      reason: r.reason,
      notes: r.notes,
      status: status,
      createdAt: r.createdAt,
    } as DayOffOrHolidayRequest;
  }
}

function openChatWithVendor(userId: number) {
  window.dispatchEvent(
    new CustomEvent("chat-open-with-user", { detail: { userId: userId } })
  );
}

export default function RequestsInboxPage() {
  const [status, setStatus] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const [loadingRequests, setLoadingRequests] = useState(false);
  const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
  const [vendors, setVendors] = useState<Awaited<ReturnType<typeof fetchVendors>>>([]);
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const { servicePartners } = useServicePartners();

  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [loadingAction, setLoadingAction] = useState<"approve" | "reject" | null>(null);

  const [scheduleTermsModalOpen, setScheduleTermsModalOpen] = useState(false);
  const [requestForScheduleTerms, setRequestForScheduleTerms] = useState<AdminRequest | null>(null);
  const [scheduleTermsInput, setScheduleTermsInput] = useState("1");
  const [feeValueInput, setFeeValueInput] = useState("0");
  const [startMonthInput, setStartMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [vendorsOffModalOpen, setVendorsOffModalOpen] = useState(false);

  const loadVendorRequests = useCallback(async () => {
    setLoadingRequests(true);
    setStatus(null);
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const servicePartnerId = selectedServicePartnerId !== '' ? Number(selectedServicePartnerId) : undefined;
      const [data, vendorsList] = await Promise.all([
        fetchVendorRequests({ month, year, servicePartnerId }).catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to fetch requests.";
          setStatus({ type: "error", title: "Error loading requests", message: msg });
          return [] as VendorRequest[];
        }),
        fetchVendors().catch(() => [] as Awaited<ReturnType<typeof fetchVendors>>),
      ]);

      setVendorRequests(
        (Array.isArray(data) ? data : []).sort((a, b) =>
          String(b.createdAt).localeCompare(String(a.createdAt))
        )
      );
      setVendors(Array.isArray(vendorsList) ? vendorsList : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load requests.";
      setStatus({ type: "error", title: "Error", message: msg });
      setVendorRequests([]);
      setVendors([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [selectedMonth, selectedServicePartnerId]);

  const vendorNameByUserId = useMemo(() => {
    const map: Record<number, string> = {};
    for (const v of vendors) {
      const userId = v.userId;
      if (userId && !Number.isNaN(userId)) {
        const name = [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
        if (name) map[userId] = name;
      }
    }
    return map;
  }, [vendors]);

  const vendorServicePartnerByUserId = useMemo(() => {
    const map: Record<number, number | null> = {};
    for (const v of vendors) {
      if (v.userId && !Number.isNaN(v.userId)) {
        map[v.userId] = v.servicePartnerId ?? null;
      }
    }
    return map;
  }, [vendors]);

  const getVendorName = useCallback(
    (userId: number) => vendorNameByUserId[userId] ?? `#${userId}`,
    [vendorNameByUserId]
  );

  useEffect(() => {
    void loadVendorRequests();
  }, [loadVendorRequests]);

  const selectedMonthKey = useMemo(
    () => `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`,
    [selectedMonth]
  );

  const allRequests = useMemo(() => {
    return vendorRequests
      .map(vendorRequestToAdminRequest)
      .filter((r) => {
        if (getRequestMonthKey(r) !== selectedMonthKey) return false;
        if (selectedServicePartnerId !== '') {
          const spId = vendorServicePartnerByUserId[r.userId];
          if (spId == null || String(spId) !== selectedServicePartnerId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = isAdvance(a) ? new Date(a.createdAt) : new Date(a.startDate);
        const dateB = isAdvance(b) ? new Date(b.createdAt) : new Date(b.startDate);
        return dateB.getTime() - dateA.getTime();
      });
  }, [vendorRequests, selectedMonthKey, selectedServicePartnerId, vendorServicePartnerByUserId]);

  const pending = useMemo(
    () => allRequests.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "pending" || s === "created" || s === "sent" || s === "open";
    }),
    [allRequests]
  );
  const approved = useMemo(
    () => allRequests.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "approved" || s === "aceito";
    }),
    [allRequests]
  );
  const rejected = useMemo(
    () => allRequests.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "rejected" || s === "recusado" || s === "reproved";
    }),
    [allRequests]
  );

  const pendingByMonth = useMemo(() => groupRequestsByMonth(pending), [pending]);
  const approvedByMonth = useMemo(() => groupRequestsByMonth(approved), [approved]);
  const rejectedByMonth = useMemo(() => groupRequestsByMonth(rejected), [rejected]);

  const filteredForMobile = useMemo(() => {
    if (!mobileSearch.trim()) return allRequests;
    const q = mobileSearch.toLowerCase().trim();
    return allRequests.filter((r) => {
      const name = getVendorName(r.userId).toLowerCase();
      const type = requestTypeLabel(r.type).toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [allRequests, mobileSearch, getVendorName]);

  const pendingFiltered = useMemo(
    () => filteredForMobile.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "pending" || s === "created" || s === "sent" || s === "open";
    }),
    [filteredForMobile]
  );
  const approvedFiltered = useMemo(
    () => filteredForMobile.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "approved" || s === "aceito";
    }),
    [filteredForMobile]
  );
  const rejectedFiltered = useMemo(
    () => filteredForMobile.filter((r) => {
      const s = String(r.status).toLowerCase();
      return s === "rejected" || s === "recusado" || s === "reproved";
    }),
    [filteredForMobile]
  );
  const pendingByMonthMobile = useMemo(() => groupRequestsByMonth(pendingFiltered), [pendingFiltered]);
  const approvedByMonthMobile = useMemo(() => groupRequestsByMonth(approvedFiltered), [approvedFiltered]);
  const rejectedByMonthMobile = useMemo(() => groupRequestsByMonth(rejectedFiltered), [rejectedFiltered]);

  const dashboardCounts = useMemo(() => {
    let advance = 0;
    let dayOff = 0;
    let holiday = 0;
    for (const r of allRequests) {
      if (isAdvance(r)) advance += 1;
      else if (r.type === "day_off") dayOff += 1;
      else holiday += 1;
    }
    return { advance, dayOff, holiday, total: advance + dayOff + holiday };
  }, [allRequests]);

  const handleApprove = useCallback(
    async (request: AdminRequest, scheduleTerms?: string, feeValue?: number, startMonth?: string) => {
      setStatus(null);
      setLoadingAction("approve");
      try {
        const vendorRequestId = typeof request.id === "number" ? request.id : Number(request.id);
        const vr = vendorRequests.find((r) => r.vendorRequestId === vendorRequestId);
        if (!vr) {
          setStatus({ type: "error", title: "Error", message: "Request not found. Try refreshing the list." });
          return;
        }

        let referenceNumber: string | undefined;
        if (isAdvance(request)) {
          const vendorName = getVendorName(request.userId);
          referenceNumber = generatePrePaymentReferenceNumber(vendorName, vendorRequestId);
        }

        await approveVendorRequestWithoutDayOffInsert(vr, scheduleTerms, feeValue, referenceNumber, startMonth);
        setStatus({ type: "success", title: "Request approved", message: "The request has been approved successfully." });
        setDetailOpen(false);
        setSelectedRequest(null);
        await loadVendorRequests();
        window.dispatchEvent(new CustomEvent("vendor-requests-updated"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to approve request.";
        setStatus({ type: "error", title: "Error", message: msg });
        throw err;
      } finally {
        setLoadingAction(null);
      }
    },
    [loadVendorRequests, vendorRequests, getVendorName]
  );

  const handleReject = useCallback(
    async (request: AdminRequest) => {
      setStatus(null);
      setLoadingAction("reject");
      try {
        const vendorRequestId = typeof request.id === "number" ? request.id : Number(request.id);
        await rejectVendorRequest(vendorRequestId);
        setDetailOpen(false);
        setSelectedRequest(null);
        await loadVendorRequests();
        window.dispatchEvent(new CustomEvent("vendor-requests-updated"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to deny request.";
        setStatus({ type: "error", title: "Error", message: msg });
      } finally {
        setLoadingAction(null);
      }
    },
    [loadVendorRequests]
  );

  const openDetail = useCallback((request: AdminRequest) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  }, []);

  const handleApprovePrePayment = useCallback((request: AdminRequest) => {
    setRequestForScheduleTerms(request);
    setScheduleTermsInput("1");
    setFeeValueInput("0");
    const now = new Date();
    setStartMonthInput(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    setDetailOpen(false);
    setSelectedRequest(null);
    setScheduleTermsModalOpen(true);
  }, []);

  const handleConfirmScheduleTerms = useCallback(async () => {
    if (!requestForScheduleTerms) return;
    try {
      const feeValue = feeValueInput ? Number.parseFloat(feeValueInput) : 0;
      await handleApprove(
        requestForScheduleTerms,
        scheduleTermsInput || undefined,
        feeValue > 0 ? feeValue : undefined,
        startMonthInput || undefined
      );
      setScheduleTermsModalOpen(false);
      setRequestForScheduleTerms(null);
      setScheduleTermsInput("1");
      setFeeValueInput("0");
      const now = new Date();
      setStartMonthInput(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    } catch {
      // handleApprove already sets status with the error
    }
  }, [requestForScheduleTerms, scheduleTermsInput, feeValueInput, startMonthInput, handleApprove]);

  return (
    <>
      {/* Desktop: admin shell (NavbarWrapper/BeamSidebar). Mobile gets its own
          branch below with the driver shell (StandardPageLayout/MobileNavBar)
          instead — this page is reachable from MobileNavBar's "Pedidos" tab,
          so it must render that same bar on mobile like every other tab does.
          The scope class must be an ANCESTOR of the hidden/md:block toggle —
          tailwind.config.cjs's `important` selector only fires nested under
          .requests-inbox-tw-scope (etc.), so a toggle div placed above/outside
          it is never actually hidden and both branches render at once. */}
      <div className="requests-inbox-tw-scope">
      <div className="hidden md:block">
        <NavbarWrapper>
          <div className="w-full min-w-0">
            <DgpPageFrame
              maxWidthClassName="w-full max-w-full"
              containerClassName="w-full px-[3%] md:px-6 lg:px-8 py-[2%] md:py-6 space-y-[2%] md:space-y-6"
              className="font-sans text-slate-800 text-sm"
            >
              <div id="main-content" className="flex-grow flex flex-col min-w-0 relative">
              <main className="pt-[2%] md:pt-6 space-y-[2%] md:space-y-4">
                <div className="mb-[2%] md:mb-4">
                  <ModernPageHeader
                    title="Vendor requests"
                    gradientFrom="slate-900"
                    gradientTo="indigo-600"
                    dashboard={
                      <>
                        <div className="flex flex-wrap items-center gap-3 mb-[2%] md:mb-4">
                          <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
                          {servicePartners.length > 0 && (
                            <select
                              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                              value={selectedServicePartnerId}
                              onChange={(e) => setSelectedServicePartnerId(e.target.value)}
                            >
                              <option value="">All Service Partners</option>
                              {servicePartners.map((sp) => (
                                <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                                  {sp.partnerName}
                                </option>
                              ))}
                            </select>
                          )}
                          <Button onClick={() => setVendorsOffModalOpen(true)} variant="outline">
                            <Users className="h-4 w-4" />
                            Vendors Off
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-[2%] md:gap-3 mb-[2%] md:mb-3">
                          <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-amber-800">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-amber-900">{pending.length}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{approved.length}</p>
                          </div>
                          <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-red-800">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-red-900">{rejected.length}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-[2%] md:gap-3 sm:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-slate-600">
                              <Wallet className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Advance</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{dashboardCounts.advance}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-slate-600">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Day Off</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{dashboardCounts.dayOff}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-slate-600">
                              <CalendarDays className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Holiday</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{dashboardCounts.holiday}</p>
                          </div>
                          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white px-[3%] md:px-4 py-[2.5%] md:py-3 shadow-sm">
                            <div className="flex items-center gap-[1.5%] md:gap-2 text-indigo-700">
                              <LayoutGrid className="h-4 w-4 shrink-0" />
                              <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-indigo-900">{dashboardCounts.total}</p>
                          </div>
                        </div>
                      </>
                    }
                    actions={
                      <>
                        {pending.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                            title={`${pending.length} request(s) pending`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {pending.length} pending
                          </span>
                        )}
                      </>
                    }
                  />
                </div>

                {status && (
                  <Alert variant={status.type === "success" ? "success" : "destructive"} className="rounded-xl shadow-sm">
                    <AlertTitle>{status.title}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-[3%] md:space-y-6">
                  <RequestSection
                    title="Pending"
                    subtitle="Awaiting your decision"
                    icon={<Clock className="h-4 w-4" />}
                    count={pending.length}
                    color="amber"
                    loading={loadingRequests}
                    emptyText="No pending requests"
                    emptySubtext="New requests will appear here"
                    byMonth={pendingByMonth}
                  >
                    {(r) => (
                      <RequestCard
                        key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                        request={r}
                        variant="pending"
                        onClick={() => openDetail(r)}
                        getVendorName={getVendorName}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onApprovePrePayment={handleApprovePrePayment}
                        loadingAction={loadingAction}
                      />
                    )}
                  </RequestSection>

                  <RequestSection
                    title="Approved"
                    subtitle="Already approved requests"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    count={approved.length}
                    color="emerald"
                    loading={loadingRequests}
                    emptyText="No approved requests"
                    emptySubtext="Approved requests will appear here"
                    byMonth={approvedByMonth}
                  >
                    {(r) => (
                      <RequestCard
                        key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                        request={r}
                        variant="approved"
                        onClick={() => openDetail(r)}
                        getVendorName={getVendorName}
                      />
                    )}
                  </RequestSection>

                  <RequestSection
                    title="Denied"
                    subtitle="Denied requests"
                    icon={<XCircle className="h-4 w-4" />}
                    count={rejected.length}
                    color="red"
                    loading={loadingRequests}
                    emptyText="No denied requests"
                    emptySubtext="Denied requests will appear here"
                    byMonth={rejectedByMonth}
                  >
                    {(r) => (
                      <RequestCard
                        key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                        request={r}
                        variant="rejected"
                        onClick={() => openDetail(r)}
                        getVendorName={getVendorName}
                      />
                    )}
                  </RequestSection>
                </div>
              </main>
              </div>
            </DgpPageFrame>
          </div>
        </NavbarWrapper>
      </div>
      </div>

      {/* Mobile: driver shell, so MobileNavBar (and its "Pedidos" tab) stays visible here too */}
      <div className="requests-inbox-tw-scope">
      <div className="md:hidden">
        <StandardPageLayout>
          <div>
            <MobilePageShell
              title="Vendor requests"
              subtitle={formatMonthLabel(selectedMonthKey)}
              searchPlaceholder="Search driver or type..."
              searchValue={mobileSearch}
              onSearchChange={setMobileSearch}
              filters={
                <div className="w-full space-y-2">
                  <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
                  {servicePartners.length > 0 && (
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedServicePartnerId}
                      onChange={(e) => setSelectedServicePartnerId(e.target.value)}
                    >
                      <option value="">All Service Partners</option>
                      {servicePartners.map((sp) => (
                        <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                          {sp.partnerName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              }
            >
              {status && (
                <Alert variant={status.type === "success" ? "success" : "destructive"} className="rounded-xl shadow-sm">
                  <AlertTitle>{status.title}</AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}
              <MobileRequestSection
                title="Pending"
                icon={<Clock className="h-4 w-4 text-amber-600" />}
                count={pendingFiltered.length}
                color="amber"
                loading={loadingRequests}
                emptyText="No pending requests"
                byMonth={pendingByMonthMobile}
              >
                {(r) => (
                  <RequestCard
                    key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                    request={r}
                    variant="pending"
                    onClick={() => openDetail(r)}
                    getVendorName={getVendorName}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onApprovePrePayment={handleApprovePrePayment}
                    loadingAction={loadingAction}
                  />
                )}
              </MobileRequestSection>
              <MobileRequestSection
                title="Approved"
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                count={approvedFiltered.length}
                color="emerald"
                loading={loadingRequests}
                emptyText="No approved requests"
                byMonth={approvedByMonthMobile}
              >
                {(r) => (
                  <RequestCard
                    key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                    request={r}
                    variant="approved"
                    onClick={() => openDetail(r)}
                    getVendorName={getVendorName}
                  />
                )}
              </MobileRequestSection>
              <MobileRequestSection
                title="Rejected"
                icon={<XCircle className="h-4 w-4 text-red-600" />}
                count={rejectedFiltered.length}
                color="red"
                loading={loadingRequests}
                emptyText="No rejected requests"
                byMonth={rejectedByMonthMobile}
              >
                {(r) => (
                  <RequestCard
                    key={isAdvance(r) ? `adv-${r.id}` : `do-${r.id}`}
                    request={r}
                    variant="rejected"
                    onClick={() => openDetail(r)}
                    getVendorName={getVendorName}
                  />
                )}
              </MobileRequestSection>
            </MobilePageShell>
          </div>
        </StandardPageLayout>
      </div>
      </div>

      <RequestDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
        getVendorName={getVendorName}
        onApprove={handleApprove}
        onApprovePrePayment={handleApprovePrePayment}
        onReject={handleReject}
        onOpenChat={openChatWithVendor}
        loadingAction={loadingAction}
      />

      <VendorsOffModal
        open={vendorsOffModalOpen}
        onOpenChange={setVendorsOffModalOpen}
        getVendorName={getVendorName}
      />

      <Dialog open={scheduleTermsModalOpen} onOpenChange={setScheduleTermsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pre-Payment — Schedule Terms & Fees</DialogTitle>
            <DialogDescription>
              Enter the installment conditions (schedule terms) and fees for this advance payment. Leave schedule terms blank to use automatic deduction of £200 per installment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="scheduleTerms">Schedule Terms (Installments)</Label>
              <select
                id="scheduleTerms"
                value={scheduleTermsInput}
                onChange={(e) => setScheduleTermsInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={String(num)}>
                    {num} {num === 1 ? "installment" : "installments"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Select the number of installments (1-12).</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startMonth">Start Month</Label>
              <input
                id="startMonth"
                type="month"
                value={startMonthInput}
                onChange={(e) => setStartMonthInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">Month when the first installment will be deducted.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feeValue">Fees <span className="text-red-500">*</span></Label>
              <select
                id="feeValue"
                value={feeValueInput}
                onChange={(e) => setFeeValueInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">0 pounds</option>
                <option value="25">25 pounds</option>
                <option value="40">40 pounds</option>
              </select>
              <p className="text-xs text-slate-500">Fees charged on installments</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScheduleTermsModalOpen(false);
                setRequestForScheduleTerms(null);
                setScheduleTermsInput("1");
                setFeeValueInput("0");
                const now = new Date();
                setStartMonthInput(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmScheduleTerms}
              disabled={loadingAction === "approve"}
              className="bg-green-600 hover:bg-green-700"
            >
              {loadingAction === "approve" ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type SectionColor = "amber" | "emerald" | "red";

const SECTION_COLOR_CLASSES: Record<SectionColor, { border: string; bg: string; headerBorder: string; headerBg: string; iconBg: string; title: string; subtitle: string; badge: string }> = {
  amber: {
    border: "border-amber-200", bg: "from-amber-50/90 to-orange-50/80",
    headerBorder: "border-amber-200/60", headerBg: "bg-amber-50/50", iconBg: "bg-amber-500",
    title: "text-amber-900", subtitle: "text-amber-700/80", badge: "bg-amber-500",
  },
  emerald: {
    border: "border-emerald-200", bg: "from-emerald-50/90 to-teal-50/80",
    headerBorder: "border-emerald-200/60", headerBg: "bg-emerald-50/50", iconBg: "bg-emerald-500",
    title: "text-emerald-900", subtitle: "text-emerald-700/80", badge: "bg-emerald-500",
  },
  red: {
    border: "border-red-200", bg: "from-red-50/90 to-red-50/80",
    headerBorder: "border-red-200/60", headerBg: "bg-red-50/50", iconBg: "bg-red-500",
    title: "text-red-900", subtitle: "text-red-700/80", badge: "bg-red-500",
  },
};

function RequestSection({
  title, subtitle, icon, count, color, loading, emptyText, emptySubtext, byMonth, children,
}: {
  title: string; subtitle: string; icon: React.ReactNode; count: number; color: SectionColor;
  loading: boolean; emptyText: string; emptySubtext: string;
  byMonth: [string, AdminRequest[]][]; children: (r: AdminRequest) => React.ReactNode;
}) {
  const c = SECTION_COLOR_CLASSES[color];
  return (
    <div className="space-y-[2%] md:space-y-3">
      <div className={`overflow-hidden rounded-2xl border-2 ${c.border} bg-gradient-to-br ${c.bg} shadow-lg backdrop-blur-sm`}>
        <div className={`flex items-center justify-between border-b ${c.headerBorder} ${c.headerBg} px-[3%] md:px-5 py-[2.5%] md:py-4`}>
          <div className="flex items-center gap-[2%] md:gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.iconBg} text-white shadow-sm`}>
              {icon}
            </div>
            <div>
              <h2 className={`text-base font-bold ${c.title}`}>{title}</h2>
              <p className={`text-xs ${c.subtitle}`}>{subtitle}</p>
            </div>
          </div>
          <span className={`rounded-full ${c.badge} px-2.5 py-0.5 text-xs font-semibold text-white`}>{count}</span>
        </div>
        <div className="p-[3%] md:p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm font-medium text-slate-700/80">{emptyText}</p>
              <p className="text-xs text-slate-500/60">{emptySubtext}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {byMonth.map(([monthKey, list]) => (
                <div key={monthKey}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600/90">
                    {formatMonthLabel(monthKey)}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((r) => children(r))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileRequestSection({
  title, icon, count, color, loading, emptyText, byMonth, children,
}: {
  title: string; icon: React.ReactNode; count: number; color: SectionColor;
  loading: boolean; emptyText: string;
  byMonth: [string, AdminRequest[]][]; children: (r: AdminRequest) => React.ReactNode;
}) {
  const c = SECTION_COLOR_CLASSES[color];
  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.headerBg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${c.headerBorder}`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-sm font-bold ${c.title}`}>{title}</span>
        </div>
        <span className={`rounded-full ${c.badge} px-2.5 py-0.5 text-xs font-semibold text-white`}>{count}</span>
      </div>
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : byMonth.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-600">{emptyText}</p>
        ) : (
          byMonth.map(([monthKey, list]) => (
            <div key={monthKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-600/90">{formatMonthLabel(monthKey)}</h3>
              <div className="space-y-2">{list.map((r) => children(r))}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type CardVariant = "pending" | "approved" | "rejected";

const cardStyles: Record<CardVariant, { wrapper: string; type: string; meta: string }> = {
  pending: {
    wrapper: "border-amber-200 bg-white shadow-sm hover:border-amber-300 hover:bg-amber-50/50",
    type: "text-amber-700",
    meta: "text-amber-600/80",
  },
  approved: {
    wrapper: "border-emerald-200 bg-white shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50",
    type: "text-emerald-700",
    meta: "text-emerald-600/80",
  },
  rejected: {
    wrapper: "border-red-200 bg-white shadow-sm hover:border-red-300 hover:bg-red-50/50",
    type: "text-red-700",
    meta: "text-red-600/80",
  },
};

function formatRequestDate(dateStr: string | undefined): string {
  if (!dateStr || !dateStr.trim()) return "—";
  const trimmed = String(dateStr).trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[parseInt(m!, 10) - 1] ?? m;
    return `${d} ${month} ${y}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return trimmed;
  }
}

function RequestCard({
  request, variant, onClick, getVendorName, onApprove, onReject, onApprovePrePayment, loadingAction,
}: {
  request: AdminRequest;
  variant: CardVariant;
  onClick: () => void;
  getVendorName: (userId: number) => string;
  onApprove?: (request: AdminRequest, scheduleTerms?: string) => void;
  onReject?: (request: AdminRequest) => void;
  onApprovePrePayment?: (request: AdminRequest) => void;
  loadingAction?: "approve" | "reject" | null;
}) {
  const isAdv = isAdvance(request);
  const vendorName = getVendorName(request.userId);
  const isDayOff = !isAdv && request.type === "day_off";
  const summary = isAdv
    ? `${vendorName} · £${Number(request.amount || 0).toFixed(2)}`
    : `${vendorName}${request.startDate ? ` · ${formatRequestDate(request.startDate)}` : ""}${request.startDate && request.endDate && request.startDate !== request.endDate ? ` – ${formatRequestDate(request.endDate)}` : ""}`;
  const styles = cardStyles[variant];
  const statusLower = String(request.status ?? "").toLowerCase();
  const isPending = statusLower === "pending" || statusLower === "created" || statusLower === "sent" || statusLower === "open";
  const showActions = variant === "pending" && isPending && (onApprove || onReject);

  const handleApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdv && onApprovePrePayment) {
      onApprovePrePayment(request);
    } else {
      onApprove?.(request);
    }
  };

  const handleDenyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(request);
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${styles.wrapper}`} role="article">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400/50 rounded-t-xl hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${styles.type}`}>
            {requestTypeLabel(request.type)}
          </span>
          <span className={`text-xs font-medium ${styles.meta}`}>{String(request.status)}</span>
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-900 leading-snug">{summary}</div>
        <div className={`mt-1.5 text-xs ${styles.meta}`}>
          {isAdv && request.createdAt
            ? new Date(request.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "startDate" in request && request.startDate
              ? (isDayOff ? "Day off date: " : "") + formatRequestDate(request.startDate) + (request.startDate !== request.endDate && request.endDate ? ` – ${formatRequestDate(request.endDate)}` : "")
              : isDayOff
                ? "Day off date not specified"
                : ""}
        </div>
      </button>
      {showActions && (
        <div className="flex gap-2 p-3 border-t border-amber-200/60 bg-amber-50/30">
          {onApprove && (
            <Button
              type="button"
              size="sm"
              onClick={handleApproveClick}
              disabled={loadingAction === "approve"}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loadingAction === "approve" ? "..." : "Approve"}
            </Button>
          )}
          {onReject && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDenyClick}
              disabled={loadingAction === "reject"}
              className="flex-1"
            >
              {loadingAction === "reject" ? "..." : "Deny"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
