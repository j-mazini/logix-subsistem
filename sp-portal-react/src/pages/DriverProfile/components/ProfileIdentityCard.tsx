import { useRef } from "react";
import { initialsFromName, type DriverProfile } from "@/app/(private)/driverProfileStorage";
import { driverProfileStyles as styles } from "../styles";

interface ProfileIdentityCardProps {
  profile: DriverProfile;
  companyName: string;
  driverId: number;
  role: string;
  onPickPhoto: (field: "avatar" | "cover", file: File) => void;
  onRemovePhoto: (field: "avatar" | "cover") => void;
}

/** Cover photo, avatar and headline identity — the photos the driver can change themselves. */
export function ProfileIdentityCard({
  profile,
  companyName,
  driverId,
  role,
  onPickPhoto,
  onRemovePhoto,
}: ProfileIdentityCardProps) {
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  // The input is reset after every pick so choosing the same file twice still
  // fires onChange (the browser skips it when the value is unchanged).
  function handlePick(field: "avatar" | "cover") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onPickPhoto(field, file);
      e.target.value = "";
    };
  }

  const displayName = profile.preferredName.trim() || profile.fullName;

  return (
    <div className={styles.identityCard}>
      <div className={styles.coverWrap}>
        {/* No empty-state text on the cover: at this height it collided with
            the avatar and the button, and the button already says what to do. */}
        {profile.cover && <img src={profile.cover} alt="" className={styles.coverImage} />}

        <button
          type="button"
          className={styles.coverButton}
          onClick={() => (profile.cover ? onRemovePhoto("cover") : coverInput.current?.click())}
        >
          <i className={`bi ${profile.cover ? "bi-trash" : "bi-camera-fill"}`} aria-hidden="true" />
          {profile.cover ? "Remove cover" : "Add cover"}
        </button>
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePick("cover")}
          aria-label="Upload cover photo"
        />
      </div>

      <div className={styles.identityBody}>
        <div className={styles.avatarWrap}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarFallback}>{initialsFromName(profile.fullName) || "—"}</span>
          )}
          <button
            type="button"
            className={styles.avatarButton}
            title={profile.avatar ? "Change photo" : "Add photo"}
            aria-label={profile.avatar ? "Change profile photo" : "Add profile photo"}
            onClick={() => avatarInput.current?.click()}
          >
            <i className="bi bi-camera-fill text-sm" aria-hidden="true" />
          </button>
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePick("avatar")}
            aria-label="Upload profile photo"
          />
        </div>

        <h2 className={styles.identityName}>{displayName}</h2>
        <p className={styles.identityMeta}>
          {role} · {companyName}
        </p>

        <dl className={styles.identityList}>
          <div className={styles.identityListRow}>
            <i className={`bi bi-person-badge ${styles.identityListIcon}`} aria-hidden="true" />
            <dt className="sr-only">Driver ID</dt>
            <dd className={styles.identityListValue}>ID {driverId}</dd>
          </div>
          {profile.phone && (
            <div className={styles.identityListRow}>
              <i className={`bi bi-telephone ${styles.identityListIcon}`} aria-hidden="true" />
              <dt className="sr-only">Phone</dt>
              <dd className={styles.identityListValue}>{profile.phone}</dd>
            </div>
          )}
          {profile.email && (
            <div className={styles.identityListRow}>
              <i className={`bi bi-envelope ${styles.identityListIcon}`} aria-hidden="true" />
              <dt className="sr-only">Email</dt>
              <dd className={styles.identityListValue} title={profile.email}>
                {profile.email}
              </dd>
            </div>
          )}
        </dl>

        {profile.avatar && (
          <button type="button" className={styles.identityRemovePhoto} onClick={() => onRemovePhoto("avatar")}>
            <i className="bi bi-trash" aria-hidden="true" /> Remove photo
          </button>
        )}
      </div>
    </div>
  );
}
