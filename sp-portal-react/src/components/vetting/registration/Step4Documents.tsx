import React, { useState } from 'react';
import type { Document, DocumentType } from '../../../types/driver';
import './styles/form-step.css';
import { X, Download } from 'lucide-react';

interface Step4Props {
  data: Document[];
  onUpdate: (data: Document[]) => void;
}

const REQUIRED_DOCUMENTS: { type: DocumentType; label: string }[] = [
  { type: 'passport', label: 'Passport' },
  { type: 'driving_license', label: 'Driving License' },
  { type: 'proof_of_address', label: 'Proof of Address' },
  { type: 'dbs', label: 'DBS Certificate' },
];

export const Step4Documents: React.FC<Step4Props> = ({ data, onUpdate }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('passport');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    setUploadError(null);
    const file = files[0];

    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    // Create document entry
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      type: selectedType,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      verified: false,
    };

    onUpdate([...data, newDoc]);
    setSelectedType('passport');
  };

  const removeDocument = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  const uploadedDocTypes = new Set(data.map((d) => d.type));
  const requiredNotUploaded = REQUIRED_DOCUMENTS.filter((doc) => !uploadedDocTypes.has(doc.type));

  return (
    <div className="form-step">
      <h2>Upload Documents</h2>

      <div className="info-box">
        <p>
          📄 Please upload clear copies of your documents. We accept PDF, JPG, and PNG files up to 10MB each.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="upload-section">
        <div className="form-group">
          <label htmlFor="docType">Document Type *</label>
          <select
            id="docType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DocumentType)}
          >
            <optgroup label="Required">
              {REQUIRED_DOCUMENTS.map((doc) => (
                <option key={doc.type} value={doc.type} disabled={uploadedDocTypes.has(doc.type)}>
                  {doc.label} {uploadedDocTypes.has(doc.type) ? '✓' : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="Optional">
              <option value="work_history">Work History</option>
              <option value="references">References</option>
            </optgroup>
          </select>
        </div>

        <div
          className={`document-upload-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              <span className="highlight">Click to upload</span> or drag and drop
            </p>
            <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>
              PDF, JPG or PNG (max 10MB)
            </p>
          </label>
        </div>

        {uploadError && (
          <div style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '0.75rem', borderRadius: '6px', marginTop: '1rem' }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Uploaded Documents */}
      {data.length > 0 && (
        <div className="uploaded-documents">
          <h3 style={{ marginBottom: '1rem', color: '#1a202c' }}>Uploaded Documents</h3>
          <div className="document-list">
            {data.map((doc, index) => (
              <div key={index} className="document-item">
                <div className="document-info">
                  <p className="document-name">{doc.fileName}</p>
                  <p className="document-type">
                    Type: {REQUIRED_DOCUMENTS.find((d) => d.type === doc.type)?.label || doc.type}
                  </p>
                </div>
                <div className="document-actions">
                  <button
                    type="button"
                    className="btn-view"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Download size={16} />
                    View
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => removeDocument(index)}
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Documents Status */}
      {requiredNotUploaded.length > 0 && (
        <div className="info-box" style={{ marginTop: '1rem' }}>
          <p>
            <strong>Required Documents Still Needed:</strong>
          </p>
          <ul style={{ margin: '0.5rem 0 0 1.5rem', color: '#22543d' }}>
            {requiredNotUploaded.map((doc) => (
              <li key={doc.type}>{doc.label}</li>
            ))}
          </ul>
        </div>
      )}

      {data.length > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          disabled={requiredNotUploaded.length > 0}
          title={requiredNotUploaded.length > 0 ? 'Upload all required documents first' : ''}
        >
          Complete Registration
        </button>
      )}
    </div>
  );
};
