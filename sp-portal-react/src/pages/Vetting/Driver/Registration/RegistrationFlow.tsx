import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../hooks/auth/useAuth';
import { useRegistration } from '../../../../hooks/vetting/useRegistration';
import { Step1PersonalInfo } from '../../../../components/vetting/registration/Step1PersonalInfo';
import { Step2Address } from '../../../../components/vetting/registration/Step2Address';
import { Step3WorkHistory } from '../../../../components/vetting/registration/Step3WorkHistory';
import { Step4Documents } from '../../../../components/vetting/registration/Step4Documents';
import './styles/registration-flow.css';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export const RegistrationFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentStep,
    formData,
    isLoading,
    error,
    updateStep1,
    updateStep2,
    updateStep3,
    updateStep4,
    goToStep,
    nextStep,
    previousStep,
    submitRegistration,
  } = useRegistration();

  React.useEffect(() => {
    if (!user) {
      navigate('/vetting/login');
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    try {
      await submitRegistration();
      navigate('/vetting/dashboard');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const steps = [
    { title: 'Personal Info', completed: currentStep > 1 },
    { title: 'Address', completed: currentStep > 2 },
    { title: 'Work History', completed: currentStep > 3 },
    { title: 'Documents', completed: currentStep > 4 },
  ];

  const isLastStep = currentStep === 4;

  return (
    <div className="registration-flow">
      <div className="registration-container">
        <div className="registration-header">
          <h1>Driver Registration</h1>
          <p>Complete your registration to start the vetting process</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
          </div>

          <div className="steps-indicator">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`step-indicator ${currentStep === index + 1 ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                onClick={() => goToStep(index + 1)}
              >
                <div className="step-number">
                  {step.completed ? <CheckCircle size={20} /> : index + 1}
                </div>
                <p>{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {/* Form Content */}
        <div className="registration-content">
          {currentStep === 1 && <Step1PersonalInfo data={formData.step1_personalInfo} onUpdate={updateStep1} />}
          {currentStep === 2 && <Step2Address data={formData.step2_address} onUpdate={updateStep2} />}
          {currentStep === 3 && (
            <Step3WorkHistory
              data={formData.step3_workHistory}
              onUpdate={updateStep3}
            />
          )}
          {currentStep === 4 && (
            <Step4Documents
              data={formData.step4_documents}
              onUpdate={updateStep4}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="registration-actions">
          <button
            className="btn btn-outline"
            onClick={previousStep}
            disabled={currentStep === 1 || isLoading}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="step-counter">
            Step {currentStep} of 4
          </div>

          {!isLastStep ? (
            <button
              className="btn btn-primary"
              onClick={nextStep}
              disabled={isLoading}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Complete Registration'}
            </button>
          )}
        </div>

        <p className="registration-info">
          Your information is secure and will only be used for the vetting process.
        </p>
      </div>
    </div>
  );
};
