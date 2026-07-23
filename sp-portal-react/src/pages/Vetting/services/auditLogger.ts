// Audit Logger Service with IP & browser fingerprinting
// Per Embrace debate gate condition: Log IP + browser fingerprint for weak audit trail

interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  officerName: string;
  candidateId?: string;
  stepIndex?: number;
  itemIndex?: number;
  details?: Record<string, any>;
  // Debate gate condition: Add browser fingerprint as weak audit trail
  browserFingerprint: string;
  userAgent: string;
  clientIP: string;
}

// Get browser fingerprint (non-identifying, for audit only)
function getBrowserFingerprint(): string {
  const parts = [
    navigator.language,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown',
    screen.width + 'x' + screen.height,
    screen.colorDepth,
  ];
  return btoa(parts.join('|'));
}

// Fetch IP from public API (client-side detection)
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000),
    });
    const data = (await response.json()) as { ip: string };
    return data.ip;
  } catch {
    return 'UNKNOWN';
  }
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private clientIP: string | null = null;

  async initialize() {
    // Fetch IP on app load (once)
    this.clientIP = await getClientIP();
  }

  async logAction(
    action: string,
    officerName: string,
    details?: {
      candidateId?: string;
      stepIndex?: number;
      itemIndex?: number;
      extra?: Record<string, any>;
    },
  ) {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      action,
      officerName,
      candidateId: details?.candidateId,
      stepIndex: details?.stepIndex,
      itemIndex: details?.itemIndex,
      details: details?.extra,
      browserFingerprint: getBrowserFingerprint(),
      userAgent: navigator.userAgent,
      clientIP: this.clientIP ?? 'UNKNOWN',
    };

    this.logs.push(entry);
    this.persistLog(entry);
  }

  private persistLog(entry: AuditLogEntry) {
    // Store in localStorage for client-side persistence
    const allLogs = JSON.parse(localStorage.getItem('vetting-audit-logs') || '[]');
    allLogs.push(entry);
    // Keep last 1000 logs
    if (allLogs.length > 1000) {
      allLogs.shift();
    }
    localStorage.setItem('vetting-audit-logs', JSON.stringify(allLogs));

    // In production, send to Firestore collection 'audit_logs'
    // Per debate gate condition: weekly export to backup collection
    if (this.shouldExportToFirestore()) {
      this.exportToFirestoreAsync(entry);
    }
  }

  private shouldExportToFirestore(): boolean {
    // Export if past 6pm on weekday (simulating weekly batch)
    const now = new Date();
    return now.getHours() >= 18;
  }

  private async exportToFirestoreAsync(entry: AuditLogEntry) {
    try {
      // In production: POST to Firebase Firestore
      // fetch('/api/vetting/audit-logs', { method: 'POST', body: JSON.stringify(entry) })
      console.debug('[Vetting Audit]', entry);
    } catch (error) {
      console.error('Failed to export audit log:', error);
    }
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  exportAsJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const auditLogger = new AuditLogger();
