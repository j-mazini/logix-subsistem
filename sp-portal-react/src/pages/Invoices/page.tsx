import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/Alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/Tabs";
import NavbarWrapper from "@/components/navbar-wrapper";
import { DgpPageFrame, GradientDotsBackground } from "@/app/(private)/components";
import { ModernPageHeader } from "@/components/modern-page-header";
import { getUserIdFromToken, hasAuthSession } from "@/app/(private)/mockAuth";
import {
  createVendorRequest,
  fetchVendorRequests,
  type VendorRequest,
} from "@/lib/vendor-requests-api";
import { toISODate, getTomorrowISODate, canRequestDayOffForDate } from "./utils";
import { DayOffRequestForm } from "./components/DayOffRequestForm";
import { HolidayRequestForm } from "./components/HolidayRequestForm";
import { PrePaymentRequestForm } from "./components/PrePaymentRequestForm";
import { RequestsHistory } from "./components/RequestsHistory";

/**
 * Faithful port of logix-sphere-frontend-nextjs's app/(private)/requests
 * (the vendor's own Day Off / Holiday / Pre-Payment request screen), mounted
 * at this subsystem's /invoices route in place of the previous billing page.
 *
 * Uses the same NavbarWrapper + GradientDotsBackground combo as the source —
 * see the inline <style> below for why: our port's admin shell paints its own
 * fixed background layers (`.liquid-glass-page-bg`, `.sidebar-inset`) that
 * would otherwise sit on top of/behind the driver-style gradient background
 * inconsistently. The source suppressed the equivalent shadcn-sidebar
 * `data-slot` layers; ours uses plain class names instead, so the selectors
 * below target those.
 */
export default function InvoicesPage() {
  const navigate = useNavigate();

  const [userId, setVendorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"dayoff" | "holiday" | "prepayment" | "requests">("dayoff");

  const [status, setStatus] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  // DayOff form (default to tomorrow: Vendor can only request day off for the next day)
  const today = useMemo(() => new Date(), []);
  const [dayOffStartDate, setDayOffStartDate] = useState<string>(() => getTomorrowISODate());
  const [dayOffReason, setDayOffReason] = useState<string>("");
  const [dayOffNotes, setDayOffNotes] = useState<string>("");

  // Holiday form
  const [holidayStartDate, setHolidayStartDate] = useState<string>(toISODate(today));
  const [holidayEndDate, setHolidayEndDate] = useState<string>("");
  const [holidayReason, setHolidayReason] = useState<string>("");
  const [holidayNotes, setHolidayNotes] = useState<string>("");

  // PrePayment form
  const [prePaymentValue, setPrePaymentValue] = useState<string>("");
  const [prePaymentReason, setPrePaymentReason] = useState<string>("");
  const [prePaymentNotes, setPrePaymentNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<VendorRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  // Month selector for request history (YYYY-MM)
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Filter requests by selected month (by createdAt)
  const requestsFilteredByMonth = useMemo(() => {
    if (!selectedMonth) return myRequests;
    const [y, m] = selectedMonth.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    return myRequests.filter((r) => {
      const created = new Date(r.createdAt);
      return created >= start && created <= end;
    });
  }, [myRequests, selectedMonth]);

  // Split by request type for separate blocks
  const dayOffRequests = useMemo(
    () => requestsFilteredByMonth.filter((r) => r.requestType === "DayOff"),
    [requestsFilteredByMonth]
  );
  const holyDayRequests = useMemo(
    () => requestsFilteredByMonth.filter((r) => r.requestType === "HolyDay"),
    [requestsFilteredByMonth]
  );
  const prePaymentRequests = useMemo(
    () => requestsFilteredByMonth.filter((r) => r.requestType === "PrePayment"),
    [requestsFilteredByMonth]
  );

  useEffect(() => {
    if (!hasAuthSession()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const id = getUserIdFromToken();
    if (id) setVendorId(id);
  }, []);

  const reloadMyRequests = useCallback(async () => {
    if (!userId) return;
    setLoadingMyRequests(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const data = await fetchVendorRequests({ userId, month, year });
      setMyRequests(data.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    } catch (err) {
      console.warn("Failed to load vendor requests for vendor:", err);
      setMyRequests([]);
    } finally {
      setLoadingMyRequests(false);
    }
  }, [userId, selectedMonth]);

  useEffect(() => {
    void reloadMyRequests();
  }, [reloadMyRequests]);

  // Clear status message when tab changes
  useEffect(() => {
    setStatus(null);
  }, [activeTab]);

  const handleSubmitDayOff = useCallback(async () => {
    setStatus(null);
    if (!userId) {
      setStatus({
        type: "error",
        title: "Unable to identify vendor",
        message: "Please log in again and try again.",
      });
      return;
    }
    if (!dayOffStartDate) {
      setStatus({ type: "error", title: "Invalid date", message: "Please select a date." });
      return;
    }

    const dayOffRule = canRequestDayOffForDate(dayOffStartDate);
    if (!dayOffRule.allowed) {
      setStatus({
        type: "error",
        title: "Day off request not allowed",
        message: dayOffRule.message ?? "You cannot submit this day off request.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createVendorRequest({
        userId,
        requestType: "DayOff",
        startDate: dayOffStartDate,
        reason: dayOffReason || undefined,
        notes: dayOffNotes || undefined,
        status: "pending",
      });

      setStatus({
        type: "success",
        title: "Request submitted",
        message: "Your day off request has been registered.",
      });
      setDayOffReason("");
      setDayOffNotes("");
      setDayOffStartDate(toISODate(new Date()));
      await reloadMyRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register day off.";
      setStatus({ type: "error", title: "Error", message });
    } finally {
      setSubmitting(false);
    }
  }, [dayOffNotes, dayOffReason, dayOffStartDate, userId, reloadMyRequests]);

  const handleSubmitHoliday = useCallback(async () => {
    setStatus(null);
    if (!userId) {
      setStatus({
        type: "error",
        title: "Unable to identify vendor",
        message: "Please log in again and try again.",
      });
      return;
    }
    if (!holidayStartDate) {
      setStatus({ type: "error", title: "Invalid date", message: "Please select a start date." });
      return;
    }
    if (!holidayEndDate) {
      setStatus({ type: "error", title: "Invalid date", message: "Please select an end date." });
      return;
    }

    const start = new Date(holidayStartDate);
    const end = new Date(holidayEndDate);
    if (end < start) {
      setStatus({ type: "error", title: "Invalid date", message: "The end date must be after the start date." });
      return;
    }

    setSubmitting(true);
    try {
      await createVendorRequest({
        userId,
        requestType: "HolyDay",
        startDate: holidayStartDate,
        endDate: holidayEndDate,
        reason: holidayReason || undefined,
        notes: holidayNotes || undefined,
        status: "pending",
      });

      setStatus({
        type: "success",
        title: "Request submitted",
        message: "Your holiday request has been registered.",
      });
      setHolidayReason("");
      setHolidayNotes("");
      setHolidayEndDate("");
      setHolidayStartDate(toISODate(new Date()));
      await reloadMyRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register holiday.";
      setStatus({ type: "error", title: "Error", message });
    } finally {
      setSubmitting(false);
    }
  }, [holidayNotes, holidayReason, holidayStartDate, holidayEndDate, userId, reloadMyRequests]);

  const handleSubmitPrePayment = useCallback(async () => {
    setStatus(null);
    if (!userId) {
      setStatus({
        type: "error",
        title: "Unable to identify vendor",
        message: "Please log in again and try again.",
      });
      return;
    }

    const parsed = Number(String(prePaymentValue).replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({
        type: "error",
        title: "Invalid amount",
        message: "Please enter an amount greater than 0.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createVendorRequest({
        userId,
        requestType: "PrePayment",
        prePaymentValue: String(parsed),
        reason: prePaymentReason || undefined,
        notes: prePaymentNotes || undefined,
        status: "pending",
      });

      setStatus({
        type: "success",
        title: "Request submitted",
        message: "Your prepayment request has been registered.",
      });
      setPrePaymentValue("");
      setPrePaymentReason("");
      setPrePaymentNotes("");
      await reloadMyRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit prepayment request.";
      setStatus({ type: "error", title: "Error", message });
    } finally {
      setSubmitting(false);
    }
  }, [prePaymentValue, prePaymentNotes, prePaymentReason, userId, reloadMyRequests]);

  return (
    <GradientDotsBackground className="invoices-tw-scope relative min-h-screen z-[1] pointer-events-auto overflow-x-hidden w-full">
      <style dangerouslySetInnerHTML={{
        __html: `
        .gradient-dots-background .liquid-glass-page-bg {
          display: none !important;
        }
        .gradient-dots-background .sidebar-wrapper,
        .gradient-dots-background .sidebar-inset,
        .gradient-dots-background .sidebar-inset > main {
          background: transparent !important;
        }
      `}} />
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
                    title="Requests"
                    subtitle="Day off, holiday and pre-payment requests"
                    gradientFrom="slate-900"
                    gradientTo="indigo-600"
                  />
                </div>

                {/* Status Alert */}
                {status && (
                  <Alert
                    variant={status.type === "success" ? "success" : "destructive"}
                    className="rounded-xl shadow-sm"
                  >
                    <AlertTitle>{status.title}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "dayoff" | "holiday" | "prepayment" | "requests")}>
                  <TabsList className="flex w-full rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm p-1 gap-1">
                    <TabsTrigger
                      value="dayoff"
                      className="rounded-lg data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all flex-1 min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-3 text-[0.65rem] sm:text-sm text-center whitespace-nowrap"
                    >
                      Day Off
                    </TabsTrigger>
                    <TabsTrigger
                      value="holiday"
                      className="rounded-lg data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all flex-1 min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-3 text-[0.65rem] sm:text-sm text-center whitespace-nowrap"
                    >
                      Holiday
                    </TabsTrigger>
                    <TabsTrigger
                      value="prepayment"
                      className="rounded-lg data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all flex-1 min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-3 text-[0.65rem] sm:text-sm text-center whitespace-nowrap"
                    >
                      Pre-Payment
                    </TabsTrigger>
                    <TabsTrigger
                      value="requests"
                      className="rounded-lg data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all font-semibold flex-1 min-w-0 py-2 sm:py-1.5 px-1.5 sm:px-3 text-[0.65rem] sm:text-sm text-center whitespace-nowrap"
                    >
                      History
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab Day Off */}
                  <TabsContent value="dayoff" className="mt-[3%] md:mt-4 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm p-4 md:p-6">
                    <DayOffRequestForm
                      date={dayOffStartDate}
                      reason={dayOffReason}
                      notes={dayOffNotes}
                      submitting={submitting}
                      onChangeDate={setDayOffStartDate}
                      onChangeReason={setDayOffReason}
                      onChangeNotes={setDayOffNotes}
                      onSubmit={handleSubmitDayOff}
                    />
                  </TabsContent>

                  {/* Tab Holiday */}
                  <TabsContent value="holiday" className="mt-[3%] md:mt-4 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm p-4 md:p-6">
                    <HolidayRequestForm
                      startDate={holidayStartDate}
                      endDate={holidayEndDate}
                      reason={holidayReason}
                      notes={holidayNotes}
                      submitting={submitting}
                      onChangeStartDate={setHolidayStartDate}
                      onChangeEndDate={setHolidayEndDate}
                      onChangeReason={setHolidayReason}
                      onChangeNotes={setHolidayNotes}
                      onSubmit={handleSubmitHoliday}
                    />
                  </TabsContent>

                  {/* Tab Pre-Payment */}
                  <TabsContent value="prepayment" className="mt-[3%] md:mt-4 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm p-4 md:p-6">
                    <PrePaymentRequestForm
                      value={prePaymentValue}
                      reason={prePaymentReason}
                      notes={prePaymentNotes}
                      submitting={submitting}
                      onChangeValue={setPrePaymentValue}
                      onChangeReason={setPrePaymentReason}
                      onChangeNotes={setPrePaymentNotes}
                      onSubmit={handleSubmitPrePayment}
                    />
                  </TabsContent>

                  {/* Tab History */}
                  <TabsContent value="requests" className="mt-[3%] md:mt-4 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm p-4 md:p-6">
                    <RequestsHistory
                      selectedMonth={selectedMonth}
                      onSelectedMonthChange={setSelectedMonth}
                      loading={loadingMyRequests}
                      onReload={() => void reloadMyRequests()}
                      dayOffRequests={dayOffRequests}
                      holyDayRequests={holyDayRequests}
                      prePaymentRequests={prePaymentRequests}
                      dayOffCount={dayOffRequests.length}
                      holidayCount={holyDayRequests.length}
                      prePaymentCount={prePaymentRequests.length}
                    />
                  </TabsContent>
                </Tabs>
              </main>
            </div>
          </DgpPageFrame>
        </div>
      </NavbarWrapper>
    </GradientDotsBackground>
  );
}
