import { useRef } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import styles from '../DeductionsDisbursementsRecharges.module.css';

/**
 * Ported from the Next.js source's DeductionModal.tsx "Upload Documents"
 * section (step 2 of the wizard) — a drag-and-drop zone plus a hidden file
 * input, with a list of staged files that can be individually removed.
 *
 * There's no backend in this project, so files never actually upload
 * anywhere: they're kept as local File objects for the lifetime of the
 * modal only (for UI/UX parity with the original), and are discarded when
 * the modal closes or the entry is saved — same simplification already
 * documented at the top of DeductionsDisbursementsRecharges.tsx.
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, same limit as the Next.js original

interface FileUploadZoneProps {
  files: File[];
  isDragOver: boolean;
  disabled?: boolean;
  onFilesAdded: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onDragStateChange: (isOver: boolean) => void;
}

function filterAcceptedFiles(fileList: FileList | File[]): File[] {
  const accepted: File[] = [];
  Array.from(fileList).forEach((file) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File ${file.name} is too large (max 5MB).`);
      return;
    }
    accepted.push(file);
  });
  return accepted;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({ files, isDragOver, disabled, onFilesAdded, onRemoveFile, onDragStateChange }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (disabled && files.length === 0) return null;

  return (
    <div className={styles.formGroup}>
      <label>Upload Documents</label>
      {!disabled && (
        <div
          className={`${styles.uploadZone} ${isDragOver ? styles.uploadZoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            onDragStateChange(true);
          }}
          onDragLeave={() => onDragStateChange(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragStateChange(false);
            onFilesAdded(filterAcceptedFiles(e.dataTransfer.files));
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <UploadCloud size={22} />
          <p>Drag &amp; drop files here, or click to browse</p>
          <p className={styles.fieldHint}>Max 5MB per file.</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              onFilesAdded(filterAcceptedFiles(e.target.files || []));
              e.target.value = '';
            }}
          />
        </div>
      )}

      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className={styles.fileItem}>
              <FileText size={16} />
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              {!disabled && (
                <button type="button" className={styles.fileRemoveBtn} onClick={() => onRemoveFile(index)} aria-label={`Remove ${file.name}`}>
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
