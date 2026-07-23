import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalInfoSchema, type PersonalInfoFormData } from '../../../lib/validations/registration';
import './styles/form-step.css';

interface Step1Props {
  data: PersonalInfoFormData;
  onUpdate: (data: PersonalInfoFormData) => void;
}

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Invalid input';
};

const NATIONALITIES = [
  'British',
  'Irish',
  'European',
  'Asian',
  'African',
  'Other',
];

export const Step1PersonalInfo: React.FC<Step1Props> = ({ data, onUpdate }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: data,
  });

  const rightToWork = watch('rightToWork');

  const onSubmit = (formData: PersonalInfoFormData) => {
    onUpdate(formData);
  };

  return (
    <form className="form-step" onSubmit={handleSubmit(onSubmit)}>
      <h2>Personal Information</h2>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            placeholder="John"
            {...register('firstName')}
            className={errors.firstName ? 'error' : ''}
          />
          {errors.firstName && <span className="error-text">{getErrorMessage(errors.firstName)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            placeholder="Doe"
            {...register('lastName')}
            className={errors.lastName ? 'error' : ''}
          />
          {errors.lastName && <span className="error-text">{getErrorMessage(errors.lastName)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register('email')}
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-text">{getErrorMessage(errors.email)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number *</label>
          <input
            id="phone"
            type="tel"
            placeholder="+44 123 456 7890"
            {...register('phone')}
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="error-text">{getErrorMessage(errors.phone)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth *</label>
          <input
            id="dateOfBirth"
            type="date"
            {...register('dateOfBirth')}
            className={errors.dateOfBirth ? 'error' : ''}
          />
          {errors.dateOfBirth && <span className="error-text">{getErrorMessage(errors.dateOfBirth)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="nationality">Nationality *</label>
          <select
            id="nationality"
            {...register('nationality')}
            className={errors.nationality ? 'error' : ''}
          >
            <option value="">Select nationality</option>
            {NATIONALITIES.map((nat) => (
              <option key={nat} value={nat}>
                {nat}
              </option>
            ))}
          </select>
          {errors.nationality && <span className="error-text">{getErrorMessage(errors.nationality)}</span>}
        </div>
      </div>

      <div className="form-group checkbox">
        <label htmlFor="rightToWork">
          <input
            id="rightToWork"
            type="checkbox"
            {...register('rightToWork')}
          />
          I have the legal right to work in the UK *
        </label>
        {errors.rightToWork && <span className="error-text">{getErrorMessage(errors.rightToWork)}</span>}
      </div>

      {rightToWork && (
        <div className="info-box">
          <p>Thank you for confirming your right to work. We'll proceed with your registration.</p>
        </div>
      )}

      <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Save & Continue
      </button>
    </form>
  );
};
