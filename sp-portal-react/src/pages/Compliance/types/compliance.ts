// User Profile Types
export type UserRole = 'driver' | 'admin' | 'vendor';
export type ComplianceStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';
export type DocumentType = 'id' | 'license' | 'proof-of-address' | 'contract' | 'insurance';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type TrainingStatus = 'not-started' | 'in-progress' | 'completed';
export type TrainingType = 'mandatory' | 'optional';
export type VettingStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';
export type VendorAccessLevel = 'full' | 'restricted' | 'none';
export type BackgroundCheckStatus = 'pending' | 'approved' | 'flagged';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  vendor: string;
  role: UserRole;

  // Compliance data
  documents: ComplianceDocument[];
  trainings: Training[];
  vettingStatus: ComplianceStatus;
  complianceScore: number; // 0-100

  // Timeline
  createdAt: string;
  lastUpdated: string;
  vettingCompletedAt?: string;

  // Metadata
  tags?: string[];
  notes?: string;
}

export interface ComplianceDocument {
  id: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  uploadedAt: string;
  expiresAt?: string;
  url: string;
  verifiedBy?: string;
  notes?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface Training {
  id: string;
  name: string;
  type: TrainingType;
  status: TrainingStatus;
  completedAt?: string;
  expiresAt?: string;
  certificateUrl?: string;
  progress?: number; // 0-100
}

export interface VettingRecord {
  id: string;
  profileId: string;
  status: VettingStatus;

  // Background check
  backgroundCheck: BackgroundCheck;

  // Checklist
  checklist: ChecklistItem[];

  // Officer assignment
  assignedOfficer?: string;

  // Timeline
  createdAt: string;
  completedAt?: string;
  lastReviewedAt?: string;

  // Impact on Vendor
  vendorAccess: VendorAccessLevel;

  // Priority and tracking
  priority: 'low' | 'medium' | 'high';
  daysInStage: number;
  slaBreached: boolean;
}

export interface BackgroundCheck {
  criminalRecord: boolean;
  status: BackgroundCheckStatus;
  notes: string;
  verifiedAt?: string;
  verifiedBy?: string;
  dbsReference?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  conditional?: boolean;
  conditionNote?: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  section?: string; // For grouping (e.g., "2.1 Pre-Interview")
}

export interface ComplianceState {
  // Data
  profiles: UserProfile[];
  // Vetting status per profile, used only to decide the conditional
  // redirect and to render the progress hint on ProfileCard — the actual
  // Vetting workflow lives in the embedded real Vetting page, not here.
  vettings: VettingRecord[];
  selectedProfile: UserProfile | null;

  // UI
  activeTab: 'profiles' | 'vetting';
  loading: boolean;
  error: string | null;

  // Modals
  modals: {
    profileDetail: boolean;
    documentUpload: boolean;
  };

  // Filters
  filters: {
    profiles: ProfileFilters;
  };
}

export interface ProfileFilters {
  status: ComplianceStatus | 'all';
  vendor: string;
  role: UserRole | 'all';
  searchQuery: string;
  sortBy: 'name' | 'date' | 'score' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface ComplianceStats {
  profiles: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
  };
  vetting: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
    slaBreached: number;
  };
  compliance: {
    averageScore: number;
    documentsApproved: number;
    documentsPending: number;
    trainingsCompleted: number;
    backgroundChecksCompleted: number;
  };
}

export interface ConditionalRedirectEvent {
  profileId: string;
  vettingId: string;
  action: 'redirect' | 'open-profile' | 'open-vetting';
  reason?: string;
}

export interface ComplianceUpdateEvent {
  profileId: string;
  vettingId?: string;
  status: ComplianceStatus;
  vendorAccess: VendorAccessLevel;
  timestamp: string;
}

export interface CandidateNote {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  author: string;
  timestamp: string;
}
