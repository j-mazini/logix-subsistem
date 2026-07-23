import { z } from 'zod';

export const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/, 'Invalid phone number'),
  dateOfBirth: z.string().refine((date) => {
    const age = new Date().getFullYear() - new Date(date).getFullYear();
    return age >= 18 && age <= 80;
  }, 'You must be between 18 and 80 years old'),
  nationality: z.string().min(2, 'Please select a nationality'),
  rightToWork: z.boolean().refine((val) => val === true, 'You must have the right to work in the UK'),
});

export const addressSchema = z.object({
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  postcode: z.string().regex(/^[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}$/i, 'Invalid UK postcode'),
  country: z.string().default('United Kingdom'),
  residenceSince: z.string().refine((date) => {
    if (!date) return false;
    const years = new Date().getFullYear() - new Date(date).getFullYear();
    return years >= 3;
  }, 'You must have lived at this address for at least 3 years'),
}).transform((data) => ({
  ...data,
  country: data.country || 'United Kingdom',
}));

export const workHistorySchema = z.object({
  employer: z.string().min(2, 'Employer name is required'),
  jobTitle: z.string().min(2, 'Job title is required'),
  startDate: z.string(),
  endDate: z.string().optional(),
  currentRole: z.boolean().default(false),
  reasonForLeaving: z.string().optional(),
  refereeeName: z.string().min(2, 'Referee name is required'),
  refereePhone: z.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/, 'Invalid referee phone number'),
  refereeEmail: z.string().email('Invalid referee email'),
}).refine(
  (data) => {
    if (!data.currentRole && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export const documentSchema = z.object({
  type: z.enum(['passport', 'driving_license', 'national_id', 'proof_of_address', 'dbs', 'references', 'work_history']),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  uploadedAt: z.string(),
  expiryDate: z.string().optional(),
  verified: z.boolean().default(false),
  notes: z.string().optional(),
});

export const step1Schema = z.object({
  step1_personalInfo: personalInfoSchema,
});

export const step2Schema = z.object({
  step1_personalInfo: personalInfoSchema,
  step2_address: addressSchema,
});

export const step3Schema = z.object({
  step1_personalInfo: personalInfoSchema,
  step2_address: addressSchema,
  step3_workHistory: z.array(workHistorySchema).min(1, 'At least one work history entry is required'),
});

export const step4Schema = z.object({
  step1_personalInfo: personalInfoSchema,
  step2_address: addressSchema,
  step3_workHistory: z.array(workHistorySchema).min(1),
  step4_documents: z.array(documentSchema).min(1, 'At least one document is required'),
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type WorkHistoryFormData = z.infer<typeof workHistorySchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
