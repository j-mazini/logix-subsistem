/**
 * The driver's own profile, persisted the only way this subsystem can: there
 * is no backend, so the single mock courier's edits (including the photos, as
 * data URLs) live in localStorage — the same trick the Service Provider's
 * profile page uses for its cover/avatar.
 *
 * UserPill listens for DRIVER_PROFILE_UPDATED_EVENT so the identity pill
 * picks up a new photo or name straight after a save, without a reload.
 */
import { MOCK_DRIVER_USER } from './mockAuth';

const STORAGE_KEY = 'dhl_driver_profile';

export const DRIVER_PROFILE_UPDATED_EVENT = 'driver-profile-updated';

export interface DriverProfile {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  about: string;
  addressLine: string;
  city: string;
  postcode: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;

  /*
   * Payment details. `bankSortCode` / `bankAccountNumber` keep the names the
   * Compliance profile uses on the Service Provider side (see
   * pages/Compliance/types/compliance.ts) — same person, same fields, so the
   * two screens stay talking about the same thing.
   */
  bankAccountHolder: string;
  bankName: string;
  bankSortCode: string;
  bankAccountNumber: string;

  /** Self-employed courier paperwork. */
  niNumber: string;
  utr: string;
  vatNumber: string;
  companyName: string;

  licenceNumber: string;
  licenceExpiry: string;
  licenceCategories: string;

  /** Data URLs — null until the driver uploads one. */
  avatar: string | null;
  cover: string | null;
}

/** Set by the depot, not by the driver — shown read-only on the profile. */
export const DRIVER_WORK_INFO = {
  driverType: 'Self-employed',
  rota: '5 on / 2 off',
  depot: 'Maidstone (ME)',
};

export const DEFAULT_DRIVER_PROFILE: DriverProfile = {
  fullName: MOCK_DRIVER_USER.fullName,
  preferredName: 'Sam',
  email: 'sam.carter@tbx.co.uk',
  phone: '+44 7700 900142',
  dateOfBirth: '1991-04-18',
  about: '',
  addressLine: '18 Mill Road',
  city: 'Maidstone',
  postcode: 'ME15 6AB',
  emergencyName: 'Rachel Carter',
  emergencyRelationship: 'Partner',
  emergencyPhone: '+44 7700 900318',
  bankAccountHolder: 'Sam Carter',
  bankName: 'Barclays',
  bankSortCode: '20-45-12',
  bankAccountNumber: '40318827',
  niNumber: 'QQ123456C',
  utr: '1234567890',
  vatNumber: '',
  companyName: '',
  licenceNumber: 'CARTE904189SM9AB',
  licenceExpiry: '2029-04-17',
  licenceCategories: 'B, BE',
  avatar: null,
  cover: null,
};

export function loadDriverProfile(): DriverProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DRIVER_PROFILE };
    // Spread over the defaults so a profile stored before a field existed
    // still opens, with the new field falling back instead of undefined.
    return { ...DEFAULT_DRIVER_PROFILE, ...(JSON.parse(raw) as Partial<DriverProfile>) };
  } catch {
    return { ...DEFAULT_DRIVER_PROFILE };
  }
}

/** Returns false when the write failed — a cover photo is a base64 data URL and can overflow the localStorage quota on its own. */
export function saveDriverProfile(profile: DriverProfile): boolean {
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    ok = false;
  }
  window.dispatchEvent(new CustomEvent(DRIVER_PROFILE_UPDATED_EVENT));
  return ok;
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function initialsFromName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
