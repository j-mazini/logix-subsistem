import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Textarea } from "./ui/Textarea";
import { MessageSquare } from "lucide-react";
import type { AdminRequest } from "../types";
import { isAdvance, requestTypeLabel } from "../types";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr || !String(dateStr).trim()) return "—";
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

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface RequestDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AdminRequest | null;
  getVendorName?: (userId: number) => string;
  onApprove?: (request: AdminRequest, scheduleTerms?: string) => void;
  onApprovePrePayment?: (request: AdminRequest) => void;
  onReject?: (request: AdminRequest) => void;
  onOpenChat?: (userId: number) => void;
  loadingAction?: "approve" | "reject" | null;
}

export function RequestDetailModal({
  open,
  onOpenChange,
  request,
  getVendorName,
  onApprove,
  onApprovePrePayment,
  onReject,
  onOpenChat,
  loadingAction,
}: RequestDetailModalProps) {
  const [scheduleTerms, setScheduleTerms] = useState<string>("");
  const [showScheduleTerms, setShowScheduleTerms] = useState(false);

  useEffect(() => {
    if (!open || !request) {
      setShowScheduleTerms(false);
      setScheduleTerms("");
    }
  }, [open, request]);

  if (!open || !request) return null;

  const vendorDisplayName = getVendorName ? getVendorName(request.userId) : `Vendor #${request.userId}`;

  const statusLower = String(request.status ?? "").toLowerCase();
  const isPending =
    statusLower === "pending" || statusLower === "created" || statusLower === "sent" || statusLower === "open";
  const isPrePayment = isAdvance(request);
  const canAct = isPending && (onApprove || onReject);

  const handleApproveClick = () => {
    if (isPrePayment) {
      if (onApprovePrePayment) {
        onApprovePrePayment(request);
      } else {
        setShowScheduleTerms(true);
      }
    } else {
      onApprove?.(request);
    }
  };

  const handleConfirmApprove = () => {
    onApprove?.(request, scheduleTerms || undefined);
    setScheduleTerms("");
    setShowScheduleTerms(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {requestTypeLabel(request.type)} — {vendorDisplayName}
          </DialogTitle>
          <DialogDescription>All request information. Use the close button to exit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Summary</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
              <dt className="font-medium text-slate-600">Type</dt>
              <dd className="text-slate-900">{requestTypeLabel(request.type)}</dd>
              <dt className="font-medium text-slate-600">Vendor</dt>
              <dd className="text-slate-900">{vendorDisplayName}</dd>
              <dt className="font-medium text-slate-600">Status</dt>
              <dd className="text-slate-900 capitalize">{String(request.status)}</dd>
              <dt className="font-medium text-slate-600">Request ID</dt>
              <dd className="text-slate-900 font-mono text-xs">{String(request.id)}</dd>
              <dt className="font-medium text-slate-600">Submitted on</dt>
              <dd className="text-slate-700 text-xs">{formatDateTime(request.createdAt)}</dd>
              {"updatedAt" in request && request.updatedAt && (
                <>
                  <dt className="font-medium text-slate-600">Updated on</dt>
                  <dd className="text-slate-700 text-xs">{formatDateTime(request.updatedAt)}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Details</h3>
            {isAdvance(request) ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                <dt className="font-medium text-slate-600">Amount</dt>
                <dd className="text-slate-900">£{Number(request.amount || 0).toFixed(2)}</dd>
                <dt className="font-medium text-slate-600">Reason</dt>
                <dd className="text-slate-800">{request.reason || "—"}</dd>
                <dt className="font-medium text-slate-600">Notes</dt>
                <dd className="text-slate-800">{request.notes || "—"}</dd>
              </dl>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                {request.type === "day_off" ? (
                  <>
                    <dt className="font-medium text-slate-600">Day off date</dt>
                    <dd className="text-slate-900">{formatDate(request.startDate)}</dd>
                  </>
                ) : (
                  <>
                    <dt className="font-medium text-slate-600">Start date</dt>
                    <dd className="text-slate-900">{formatDate(request.startDate)}</dd>
                    <dt className="font-medium text-slate-600">End date</dt>
                    <dd className="text-slate-900">{formatDate(request.endDate)}</dd>
                  </>
                )}
                <dt className="font-medium text-slate-600">Reason</dt>
                <dd className="text-slate-800">{request.reason || "—"}</dd>
                <dt className="font-medium text-slate-600">Notes</dt>
                <dd className="text-slate-800">{request.notes || "—"}</dd>
              </dl>
            )}
          </section>

          <section className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {onOpenChat && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChat(request.userId);
                    onOpenChange(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat with vendor
                </Button>
              )}
              {canAct && onApprove && !showScheduleTerms && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApproveClick}
                  disabled={loadingAction === "approve"}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loadingAction === "approve" ? "Approving..." : "Approve"}
                </Button>
              )}
              {canAct && onReject && !showScheduleTerms && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject(request)}
                  disabled={loadingAction === "reject"}
                >
                  {loadingAction === "reject" ? "Denying..." : "Deny"}
                </Button>
              )}
            </div>
          </section>

          {showScheduleTerms && isPrePayment && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleTerms">Schedule Terms (optional)</Label>
                <Textarea
                  id="scheduleTerms"
                  placeholder="e.g., 4 installments of £50 each"
                  value={scheduleTerms}
                  onChange={(e) => setScheduleTerms(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-slate-500">
                  Leave empty for automatic deduction schedule based on £200 per installment.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowScheduleTerms(false);
                    setScheduleTerms("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmApprove}
                  disabled={loadingAction === "approve"}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loadingAction === "approve" ? "Approving..." : "Confirm Approve"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
