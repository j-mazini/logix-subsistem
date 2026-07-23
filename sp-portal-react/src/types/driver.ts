export type DriverStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'withdrawn';
export type DocumentType = 'passport' | 'driving_license' | 'national_id' | 'proof_of_address' | 'dbs' | 'references' | 'work_history';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  rightToWork: boolean;
}

export interface Address {
  street: string;
  city: string;
  postcode: string;
  country: string;
  residenceSince: string;
}

export interface WorkHistory {
  id?: string;
  employer: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  currentRole: boolean;
  reasonForLeaving?: string;
  refereeeName: string;
  refereePhone: string;
  refereeEmail: string;
}

export interface Document {
  id?: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  expiryDate?: string;
  verified: boolean;
  notes?: string;
}

export interface RegistrationStep {
  step: number;
  title: string;
  completed: boolean;
  data?: any;
}

export interface Driver {
  id: string;
  userId: string;
  email: string;
  status: DriverStatus;
  personalInfo?: PersonalInfo;
  address?: Address;
  workHistory?: WorkHistory[];
  documents?: Document[];
  registrationSteps?: RegistrationStep[];
  applicationDate: string;
  lastUpdated: string;
  notes?: string;
  rejectionReason?: string;
}

export interface RegistrationFormData {
  step1_personalInfo: PersonalInfo;
  step2_address: Address;
  step3_workHistory: WorkHistory[];
  step4_documents: Document[];
}

export interface RegistrationResponse {
  success: boolean;
  driverId: string;
  message: string;
}
