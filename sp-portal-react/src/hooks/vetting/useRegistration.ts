import { useState, useCallback } from 'react';
import type { RegistrationFormData, Driver } from '../../types/driver';
import { driverService } from '../../services/vetting/driverService';

const INITIAL_STATE: RegistrationFormData = {
  step1_personalInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    rightToWork: false,
  },
  step2_address: {
    street: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    residenceSince: '',
  },
  step3_workHistory: [],
  step4_documents: [],
};

export const useRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationFormData>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);

  const updateStep1 = useCallback((data: typeof INITIAL_STATE.step1_personalInfo) => {
    setFormData((prev) => ({
      ...prev,
      step1_personalInfo: data,
    }));
    setError(null);
  }, []);

  const updateStep2 = useCallback((data: typeof INITIAL_STATE.step2_address) => {
    setFormData((prev) => ({
      ...prev,
      step2_address: data,
    }));
    setError(null);
  }, []);

  const updateStep3 = useCallback((data: typeof INITIAL_STATE.step3_workHistory) => {
    setFormData((prev) => ({
      ...prev,
      step3_workHistory: data,
    }));
    setError(null);
  }, []);

  const addWorkHistory = useCallback((entry: (typeof INITIAL_STATE.step3_workHistory)[0]) => {
    setFormData((prev) => ({
      ...prev,
      step3_workHistory: [...prev.step3_workHistory, entry],
    }));
  }, []);

  const removeWorkHistory = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      step3_workHistory: prev.step3_workHistory.filter((_, i) => i !== index),
    }));
  }, []);

  const updateStep4 = useCallback((data: typeof INITIAL_STATE.step4_documents) => {
    setFormData((prev) => ({
      ...prev,
      step4_documents: data,
    }));
    setError(null);
  }, []);

  const addDocument = useCallback((doc: (typeof INITIAL_STATE.step4_documents)[0]) => {
    setFormData((prev) => ({
      ...prev,
      step4_documents: [...prev.step4_documents, doc],
    }));
  }, []);

  const removeDocument = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      step4_documents: prev.step4_documents.filter((_, i) => i !== index),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
      setError(null);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const submitRegistration = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await driverService.submitRegistration(formData);
      setDriver({ ...formData, id: response.driverId } as any);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  const reset = useCallback(() => {
    setFormData(INITIAL_STATE);
    setCurrentStep(1);
    setError(null);
    setDriver(null);
  }, []);

  return {
    currentStep,
    formData,
    isLoading,
    error,
    driver,
    updateStep1,
    updateStep2,
    updateStep3,
    updateStep4,
    addWorkHistory,
    removeWorkHistory,
    addDocument,
    removeDocument,
    goToStep,
    nextStep,
    previousStep,
    submitRegistration,
    reset,
  };
};
