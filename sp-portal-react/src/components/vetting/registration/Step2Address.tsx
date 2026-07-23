import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema } from '../../../lib/validations/registration';
import './styles/form-step.css';

interface Step2Props {
  data: any;
  onUpdate: (data: any) => void;
}

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Invalid input';
};

export const Step2Address: React.FC<Step2Props> = ({ data, onUpdate }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: data,
  });

  const onSubmit = (formData: any) => {
    onUpdate(formData);
  };

  return (
    <form className="form-step" onSubmit={handleSubmit(onSubmit)}>
      <h2>Current Address</h2>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="street">Street Address *</label>
          <input
            id="street"
            type="text"
            placeholder="123 Main Street"
            {...register('street')}
            className={errors.street ? 'error' : ''}
          />
          {errors.street && <span className="error-text">{getErrorMessage(errors.street)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            id="city"
            type="text"
            placeholder="London"
            {...register('city')}
            className={errors.city ? 'error' : ''}
          />
          {errors.city && <span className="error-text">{getErrorMessage(errors.city)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="postcode">Postcode *</label>
          <input
            id="postcode"
            type="text"
            placeholder="SW1A 1AA"
            {...register('postcode')}
            className={errors.postcode ? 'error' : ''}
          />
          {errors.postcode && <span className="error-text">{getErrorMessage(errors.postcode)}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="country">Country *</label>
          <input
            id="country"
            type="text"
            readOnly
            value="United Kingdom"
            {...register('country')}
            className={errors.country ? 'error' : ''}
          />
        </div>

        <div className="form-group">
          <label htmlFor="residenceSince">Living at this address since *</label>
          <input
            id="residenceSince"
            type="date"
            {...register('residenceSince')}
            className={errors.residenceSince ? 'error' : ''}
          />
          {errors.residenceSince && <span className="error-text">{getErrorMessage(errors.residenceSince)}</span>}
        </div>
      </div>

      <div className="info-box">
        <p>
          ℹ️ You must have lived at this address for at least 3 years. If not, please provide previous addresses in your application.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Save & Continue
      </button>
    </form>
  );
};
