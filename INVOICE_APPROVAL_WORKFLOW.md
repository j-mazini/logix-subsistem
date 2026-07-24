# Invoice Approval Workflow System

## Overview

The Invoice Approval Workflow adds a verification/approval step to the invoice processing pipeline. This ensures that invoices are reviewed and explicitly approved by authorized personnel before proceeding to invoice generation.

## Workflow Integration

This feature integrates seamlessly with the existing status automation system:

```
Current Period → Pending Verification ←→ [APPROVAL GATE] ←→ Ready to Invoice → Invoiced → Scheduled for Payment → Invoice History
                        ↑
                  requiresApproval: true
                        ↓
                  Opens Approval Modal
                  (if user.canApprove)
```

## Key Features

### 1. Role-Based Access Control

Only users with approval permissions can approve invoices:

```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'viewer' | 'processor' | 'approver' | 'admin';
  canApprove: boolean;  // true only for 'approver' and 'admin' roles
}
```

**User Roles**:
- **viewer**: Can only view invoices (no approval)
- **processor**: Can create and modify invoices (no approval)
- **approver**: Can review and approve pending invoices
- **admin**: Full access including approval

### 2. Approval Modal

When a user with approval permissions clicks the "Approve" button (✓ icon) on a "Pending Verification" invoice, a detailed approval modal opens showing:

**Invoice Details Section**:
- Invoice ID
- Subcontractor name
- Billing period
- Invoice amount (highlighted)

**Approval Information Section**:
- Approver name (current user)
- Approval timestamp (auto-filled with current time)

**Optional Notes Section**:
- Text area for adding approval comments or notes
- Supports rich context for record-keeping

### 3. Approval Actions

**Approve Button**:
- Transitions invoice from "Pending Verification" to "Ready to Invoice"
- Creates approval log entry with timestamp
- Updates status audit trail
- Closes modal on success
- Shows confirmation toast: `✓ REC-2025001 approved and moved to Ready to Invoice.`

**Reject Button**:
- Closes the approval modal
- Keeps invoice in "Pending Verification" status
- Allows user to request corrections without changing status

### 4. Approval Audit Logging

Each approval is recorded in the ApprovalLog:

```typescript
interface ApprovalLog {
  id: string;                    // Unique approval entry ID
  recordId: string;              // Which invoice was approved
  approvedBy: string;            // Who approved it (user name)
  approvedAt: string;            // ISO timestamp of approval
  notes?: string;                // Optional approval notes/context
}
```

The approval is also added to the status audit trail:

```
{
  id: "audit-REC-2025001-1721795376000",
  recordId: "REC-2025001",
  previousStatus: "Pending Verification",
  newStatus: "Ready to Invoice",
  timestamp: "2026-07-24T10:39:44.123Z",
  triggeredBy: "manual",
  notes: "Approved by Finance Manager: Amount verified against supporting documents"
}
```

### 5. Permission-Based UI

The "Approve" button (✓ icon) only appears for:
- Invoices in "Pending Verification" status
- Users with `canApprove: true` permission

**Non-Approvers See**:
- View button (👁)
- Audit trail button (🕐)
- Move/transition buttons (but not "Approve")

**Approvers See**:
- View button (👁)
- Audit trail button (🕐)
- **Approve button (✓)** ← New
- Move/transition buttons

### 6. Approval Requirements Tracking

Each WorkflowRecord tracks approval status:

```typescript
interface WorkflowRecord {
  // ... existing fields ...
  requiresApproval: boolean;      // true if status is "Pending Verification"
  approvalLog?: ApprovalLog;      // populated after approval
}
```

## User Workflows

### Scenario 1: Standard Approval Process

1. **Month Closes**
   - Invoice created with status: "Current Period"

2. **Submit for Verification**
   - User clicks "Move to Ready"
   - Status changes to: "Pending Verification"
   - `requiresApproval: true`

3. **Approval Workflow**
   - Approver sees invoice in workflow dashboard
   - Clicks "Approve" button (✓ icon)
   - Approval modal opens

4. **Review & Approve**
   - Approver reviews invoice details
   - Optionally adds notes: "Amount verified against contract"
   - Clicks "Approve Invoice" button

5. **Auto-Transition**
   - Status changes to: "Ready to Invoice"
   - Approval log created with timestamp
   - Audit trail updated
   - Toast confirms: `✓ REC-2025001 approved and moved to Ready to Invoice.`

### Scenario 2: Rejection (Request Corrections)

1. **Approver Reviews** and finds discrepancy
2. **Clicks "Reject"** button
3. **Modal closes**, invoice remains in "Pending Verification"
4. **Notes about issue** can be added via "View" button detail modal
5. **Processor corrects** the invoice
6. **Re-submits** for approval
7. **Process repeats** with new approval

### Scenario 3: Non-Approver Workflow

1. **Processor** opens invoice in "Pending Verification"
2. **Cannot see "Approve" button** (no permission)
3. **Can only see**: View, Audit Trail, and Move buttons
4. **Must wait** for approver to review and approve
5. **Approval happens independently** by authorized user

## API Integration (Future)

For production deployment, integrate with backend:

```typescript
// Send approval to backend
async function submitApproval(recordId: string, approvalLog: ApprovalLog) {
  const response = await fetch('/api/invoices/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId,
      approvalLog,
      statusChange: {
        from: 'Pending Verification',
        to: 'Ready to Invoice',
        triggeredBy: 'manual',
        notes: `Approved by ${approvalLog.approvedBy}${approvalLog.notes ? ': ' + approvalLog.notes : ''}`
      }
    })
  });
  return response.json();
}

// Retrieve approval history
async function getApprovalHistory(recordId: string) {
  const response = await fetch(`/api/invoices/${recordId}/approvals`);
  return response.json();
}
```

## Permission Management

### Setting User Permissions

```typescript
// Backend endpoint to update user role
PUT /api/users/{userId}/role
{
  "role": "approver"  // grants canApprove: true
}

// Or
PATCH /api/users/{userId}
{
  "canApprove": true
}
```

### Permission Verification

Always verify permissions server-side:

```typescript
// Backend route protection
app.post('/api/invoices/approve', requireAuth, (req, res) => {
  if (!req.user.canApprove) {
    return res.status(403).json({ error: 'Not authorized to approve invoices' });
  }
  // Process approval...
});
```

## Compliance & Audit

### Approval Compliance

This system ensures:

✅ **Authorization**: Only approved users can approve  
✅ **Non-Repudiation**: Approver name and timestamp logged  
✅ **Immutability**: Approval records cannot be modified  
✅ **Traceability**: Complete audit trail of who approved what when  
✅ **Accountability**: All approvals attributed to specific users  

### Audit Trail Example

```
2026-07-24T10:35:22.100Z (manual) - Current Period → Pending Verification - Submitted for review
2026-07-24T10:39:44.250Z (manual) - Pending Verification → Ready to Invoice - Approved by Finance Manager: Amount verified against supporting documents
2026-07-24T10:45:10.500Z (manual) - Ready to Invoice → Invoiced - Invoice generated
```

## UI Components

### Approval Button
- Icon: ✓ (check-circle)
- Color: Green (#16a34a)
- Title: "Open for approval"
- Location: Actions column, Pending Verification status only
- Visibility: Only for users with canApprove=true

### Approval Modal
- Width: centered, medium width (modal-dialog-centered)
- Header: "📋 Review & Approve Invoice"
- Content sections: Invoice Details, Approval Info, Optional Notes
- Footer: "Reject" (outline) and "Approve Invoice" (success) buttons
- Dismissable: Click backdrop or close (X) button

### Toast Notifications
- **Success**: `✓ {recordId} approved and moved to Ready to Invoice.`
- **Error**: `✗ Cannot transition from "Pending Verification" to "Ready to Invoice"` (if validation fails)
- **Warning**: `You do not have permission to approve invoices.` (if non-approver clicks button)

## Data Structure

### ApprovalLog Interface

```typescript
interface ApprovalLog {
  id: string;              // auto-generated: approval-{recordId}-{timestamp}
  recordId: string;        // invoice ID being approved
  approvedBy: string;      // user name (e.g., "Finance Manager")
  approvedAt: string;      // ISO 8601 timestamp
  notes?: string;          // optional approval comments
}
```

### Enhanced WorkflowRecord

```typescript
interface WorkflowRecord {
  id: string;
  sub: string;
  period: string;
  amount: number;
  status: WorkflowStatus;
  lastStatusChange: string;
  auditTrail: StatusAuditLog[];
  requiresApproval: boolean;    // NEW: true if "Pending Verification"
  approvalLog?: ApprovalLog;    // NEW: populated after approval
}
```

## CSS Styling

New approval workflow styles:

```css
.icon-btn--ready {
  background: rgba(22, 163, 74, 0.12);
  color: var(--success-green);
}

.approval-summary {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.summary-section {
  padding: 1rem;
  background: var(--bg-secondary);
  border-left: 3px solid var(--primary-blue);
  border-radius: var(--radius);
}
```

## Testing Checklist

- [ ] Non-approver cannot see "Approve" button
- [ ] Approver can click "Approve" button on Pending Verification invoices
- [ ] Approval modal opens with correct invoice details
- [ ] Approval notes can be entered and retrieved
- [ ] Clicking "Approve Invoice" transitions status to "Ready to Invoice"
- [ ] Approval log is created with correct user name and timestamp
- [ ] Audit trail shows approval transition with notes
- [ ] Clicking "Reject" closes modal without changing status
- [ ] Toast notifications appear on success/error
- [ ] Invalid transitions show error message
- [ ] Audit trail button shows complete approval history

## Future Enhancements

1. **Multi-Level Approvals**
   - Require sequential approval from multiple users
   - e.g., Team Lead → Manager → Finance Director

2. **Conditional Approval**
   - Amount-based approval thresholds
   - e.g., Amounts > £5,000 require Finance Director approval

3. **Approval Workflow Rules**
   - SLA timers for approval turnaround
   - Auto-escalation if not approved within X hours
   - Approval notifications via email/SMS

4. **Approval History Analytics**
   - Approval time metrics
   - Approver workload distribution
   - Rejection rate tracking

5. **Approval Templates**
   - Pre-configured approval note templates
   - Quick-select reasons for rejection
   - Standardized approval comments

## Conclusion

The Invoice Approval Workflow provides:

- ✅ **Role-based access control** for invoice approvals
- ✅ **Detailed audit logging** of who approved and when
- ✅ **Secure state transitions** with validation
- ✅ **User-friendly interface** for reviewers
- ✅ **Complete compliance** with audit requirements
- ✅ **Seamless integration** with existing automation

This ensures invoices are properly reviewed before generation, improving accuracy and accountability in the invoice processing pipeline.
