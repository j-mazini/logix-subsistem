import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadDriverProfile,
  readImageAsDataUrl,
  saveDriverProfile,
  type DriverProfile,
} from "@/app/(private)/driverProfileStorage";
import { validatePaymentDetails } from "../utils";

type ToastKind = "success" | "error";

interface Toast {
  kind: ToastKind;
  message: string;
}

/**
 * Form state for the driver's profile. Edits stay local until Save, so the
 * identity pill (which reads the persisted copy) never shows a half-typed
 * name — Discard just reloads what is stored.
 */
export function useDriverProfile() {
  const [profile, setProfile] = useState<DriverProfile>(() => loadDriverProfile());
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
  }, []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const setField = useCallback(<K extends keyof DriverProfile>(field: K, value: DriverProfile[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const setPhoto = useCallback(
    async (field: "avatar" | "cover", file: File) => {
      if (!file.type.startsWith("image/")) {
        showToast("error", "Choose an image file");
        return;
      }
      const dataUrl = await readImageAsDataUrl(file);
      setProfile((prev) => ({ ...prev, [field]: dataUrl }));
      setDirty(true);
    },
    [showToast]
  );

  const removePhoto = useCallback((field: "avatar" | "cover") => {
    setProfile((prev) => ({ ...prev, [field]: null }));
    setDirty(true);
  }, []);

  const save = useCallback(() => {
    if (!profile.fullName.trim()) {
      showToast("error", "Full name can't be empty");
      return;
    }
    const problem = validatePaymentDetails(profile);
    if (problem) {
      showToast("error", problem);
      return;
    }
    const ok = saveDriverProfile(profile);
    if (!ok) {
      showToast("error", "Couldn't save — the photos are too large for this device's storage");
      return;
    }
    setDirty(false);
    showToast("success", "Profile saved");
  }, [profile, showToast]);

  const discard = useCallback(() => {
    setProfile(loadDriverProfile());
    setDirty(false);
  }, []);

  return { profile, dirty, toast, setField, setPhoto, removePhoto, save, discard };
}
