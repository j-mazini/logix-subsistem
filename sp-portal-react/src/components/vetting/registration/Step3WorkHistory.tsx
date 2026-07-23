import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workHistorySchema } from '../../../lib/validations/registration';
import type { WorkHistory } from '../../../types/driver';
import './styles/form-step.css';
import { X, Plus } from 'lucide-react';

interface Step3Props {
  data: WorkHistory[];
  onUpdate: (data: WorkHistory[]) => void;
}

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'Invalid input';
};

export const Step3WorkHistory: React.FC<Step3Props> = ({ data, onUpdate }) => {
  const [showForm, setShowForm] = useState(data.length === 0);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(workHistorySchema),
  });

  const currentRole = watch('currentRole');

  const onSubmit = (formData: any) => {
    const newEntry: WorkHistory = {
      id: `work-${Date.now()}`,
      ...formData,
    };
    onUpdate([...data, newEntry]);
    reset();
    setShowForm(false);
  };

  const removeEntry = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  return (
    <div className="form-step">
      <h2>Work History (Last 5 Years)</h2>

      {/* Work History Entries */}
      {data.length > 0 && (
        <div className="work-history-list">
          {data.map((entry, index) => (
            <div key={index} className={`work-history-entry ${entry.currentRole ? 'current' : ''}`}>
              <div className="work-history-header">
                <div>
                  <h3>{entry.jobTitle} at {entry.employer}</h3>
                  {entry.currentRole && <span className="current-role-badge">Current Role</span>}
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => removeEntry(index)}
                >
                  <X size={16} />
                  Remove
                </button>
              </div>

              <div className="form-grid" style={{ marginBottom: 0 }}>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#718096' }}>
                    From
                  </p>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {new Date(entry.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#718096' }}>
                    To
                  </p>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {entry.currentRole ? 'Present' : new Date(entry.endDate!).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#718096' }}>
                    Referee
                  </p>
                  <p style={{ margin: 0, fontWeight: 500 }}>{entry.refereeeName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Form */}
      {showForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="work-history-entry">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="employer">Employer *</label>
              <input
                id="employer"
                type="text"
                placeholder="Company Name Ltd"
                {...register('employer')}
                className={errors.employer ? 'error' : ''}
              />
              {errors.employer && <span className="error-text">{getErrorMessage(errors.employer)}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle">Job Title *</label>
              <input
                id="jobTitle"
                type="text"
                placeholder="Driver"
                {...register('jobTitle')}
                className={errors.jobTitle ? 'error' : ''}
              />
              {errors.jobTitle && <span className="error-text">{getErrorMessage(errors.jobTitle)}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={errors.startDate ? 'error' : ''}
              />
              {errors.startDate && <span className="error-text">{getErrorMessage(errors.startDate)}</span>}
            </div>

            {!currentRole && (
              <div className="form-group">
                <label htmlFor="endDate">End Date *</label>
                <input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  className={errors.endDate ? 'error' : ''}
                />
                {errors.endDate && <span className="error-text">{getErrorMessage(errors.endDate)}</span>}
              </div>
            )}

            <div className="form-group checkbox">
              <label>
                <input type="checkbox" {...register('currentRole')} />
                I currently work here
              </label>
            </div>

            {!currentRole && (
              <div className="form-group">
                <label htmlFor="reasonForLeaving">Reason for Leaving</label>
                <input
                  id="reasonForLeaving"
                  type="text"
                  placeholder="Left for better opportunity"
                  {...register('reasonForLeaving')}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="refereeeName">Referee Name *</label>
              <input
                id="refereeeName"
                type="text"
                placeholder="John Manager"
                {...register('refereeeName')}
                className={errors.refereeeName ? 'error' : ''}
              />
              {errors.refereeeName && <span className="error-text">{getErrorMessage(errors.refereeeName)}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="refereePhone">Referee Phone *</label>
              <input
                id="refereePhone"
                type="tel"
                placeholder="+44 123 456 7890"
                {...register('refereePhone')}
                className={errors.refereePhone ? 'error' : ''}
              />
              {errors.refereePhone && <span className="error-text">{getErrorMessage(errors.refereePhone)}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="refereeEmail">Referee Email *</label>
              <input
                id="refereeEmail"
                type="email"
                placeholder="john@company.com"
                {...register('refereeEmail')}
                className={errors.refereeEmail ? 'error' : ''}
              />
              {errors.refereeEmail && <span className="error-text">{getErrorMessage(errors.refereeEmail)}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Save Entry
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setShowForm(true)}
          style={{ marginTop: '1rem' }}
        >
          <Plus size={18} />
          Add Work History
        </button>
      )}

      {data.length > 0 && !showForm && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onUpdate(data)}
          style={{ marginTop: '1rem' }}
        >
          Continue
        </button>
      )}
    </div>
  );
};
