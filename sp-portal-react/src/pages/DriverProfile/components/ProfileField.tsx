import { driverProfileStyles as styles } from "../styles";

interface ProfileFieldProps {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  /** Rendered as static text — used for what the driver can't set themselves (company, driver ID, role). */
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
}

export function ProfileField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  readOnly = false,
  multiline = false,
  rows = 3,
  fullWidth = false,
}: ProfileFieldProps) {
  return (
    <div className={`${styles.fieldWrap}${fullWidth ? ` ${styles.fieldFullWidth}` : ""}`}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>

      {readOnly ? (
        <div id={id} className={styles.fieldReadOnlyRow}>
          <span className={styles.fieldReadOnlyValue}>{value || "—"}</span>
          <i className={`bi bi-lock-fill ${styles.fieldReadOnlyIcon}`} aria-label="Set by your Service Provider" />
        </div>
      ) : multiline ? (
        <textarea
          id={id}
          className={styles.fieldTextarea}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={styles.fieldInput}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}

      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  );
}
