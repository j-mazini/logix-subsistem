import { StandardPageLayout, PageHeroCard } from "@/app/(private)/components";
import { MOCK_DRIVER_USER } from "@/app/(private)/mockAuth";
import { DRIVER_WORK_INFO } from "@/app/(private)/driverProfileStorage";
import { digitsOnly, formatNiNumber, formatSortCode } from "./utils";
import { ProfileIdentityCard } from "./components/ProfileIdentityCard";
import { ProfileSection } from "./components/ProfileSection";
import { ProfileField } from "./components/ProfileField";
import { useDriverProfile } from "./hooks/useDriverProfile";
import { driverProfileStyles as styles } from "./styles";

export default function DriverProfilePage() {
  const { profile, dirty, toast, setField, setPhoto, removePhoto, save, discard } = useDriverProfile();

  return (
    <StandardPageLayout bottomPadding="pb-[70px]">
      <PageHeroCard
        icon="bi-person-circle"
        title="My Profile"
        subtitle="Your personal details, photo and emergency contact"
        accent="violet"
      />

      <div className={styles.layout}>
        <div className={styles.identityColumn}>
          <ProfileIdentityCard
            profile={profile}
            companyName={MOCK_DRIVER_USER.companyName}
            driverId={MOCK_DRIVER_USER.id}
            role="Driver"
            onPickPhoto={setPhoto}
            onRemovePhoto={removePhoto}
          />
        </div>

        <div className={styles.formColumn}>
          <ProfileSection icon="bi-person-vcard" title="Personal details" subtitle="How the depot reaches you">
            <ProfileField
              id="driverFullName"
              label="Full name"
              value={profile.fullName}
              onChange={(v) => setField("fullName", v)}
              placeholder="As it appears on your licence"
            />
            <ProfileField
              id="driverPreferredName"
              label="Preferred name"
              value={profile.preferredName}
              onChange={(v) => setField("preferredName", v)}
              hint="Shown across the driver app"
            />
            <ProfileField
              id="driverEmail"
              label="Email"
              type="email"
              value={profile.email}
              onChange={(v) => setField("email", v)}
            />
            <ProfileField
              id="driverPhone"
              label="Phone"
              type="tel"
              value={profile.phone}
              onChange={(v) => setField("phone", v)}
            />
            <ProfileField
              id="driverDob"
              label="Date of birth"
              type="date"
              value={profile.dateOfBirth}
              onChange={(v) => setField("dateOfBirth", v)}
            />
            <ProfileField
              id="driverAbout"
              label="About"
              value={profile.about}
              onChange={(v) => setField("about", v)}
              placeholder="Anything the depot should know — shifts you prefer, languages you speak…"
              multiline
              fullWidth
            />
          </ProfileSection>

          <ProfileSection icon="bi-geo-alt" title="Address" subtitle="Where your route starts from" tone="sky">
            <ProfileField
              id="driverAddressLine"
              label="Address"
              value={profile.addressLine}
              onChange={(v) => setField("addressLine", v)}
              fullWidth
            />
            <ProfileField
              id="driverCity"
              label="City"
              value={profile.city}
              onChange={(v) => setField("city", v)}
            />
            <ProfileField
              id="driverPostcode"
              label="Postcode"
              value={profile.postcode}
              onChange={(v) => setField("postcode", v.toUpperCase())}
              placeholder="ME15 6AB"
            />
          </ProfileSection>

          <ProfileSection
            icon="bi-heart-pulse"
            title="Emergency contact"
            subtitle="Who we call if something happens on the road"
            tone="amber"
          >
            <ProfileField
              id="driverEmergencyName"
              label="Name"
              value={profile.emergencyName}
              onChange={(v) => setField("emergencyName", v)}
            />
            <ProfileField
              id="driverEmergencyRelationship"
              label="Relationship"
              value={profile.emergencyRelationship}
              onChange={(v) => setField("emergencyRelationship", v)}
              placeholder="Partner, parent, friend…"
            />
            <ProfileField
              id="driverEmergencyPhone"
              label="Phone"
              type="tel"
              value={profile.emergencyPhone}
              onChange={(v) => setField("emergencyPhone", v)}
              fullWidth
            />
          </ProfileSection>

          <ProfileSection
            icon="bi-bank"
            title="Bank details"
            subtitle="Where your weekly payment lands — only the depot's finance team sees this"
            tone="emerald"
          >
            <ProfileField
              id="driverBankHolder"
              label="Account holder"
              value={profile.bankAccountHolder}
              onChange={(v) => setField("bankAccountHolder", v)}
              hint="Must match the name on the account"
            />
            <ProfileField
              id="driverBankName"
              label="Bank"
              value={profile.bankName}
              onChange={(v) => setField("bankName", v)}
              placeholder="Barclays, Monzo…"
            />
            <ProfileField
              id="driverSortCode"
              label="Sort code"
              value={profile.bankSortCode}
              onChange={(v) => setField("bankSortCode", formatSortCode(v))}
              placeholder="20-45-12"
            />
            <ProfileField
              id="driverAccountNumber"
              label="Account number"
              value={profile.bankAccountNumber}
              onChange={(v) => setField("bankAccountNumber", digitsOnly(v, 8))}
              placeholder="8 digits"
            />
          </ProfileSection>

          <ProfileSection
            icon="bi-file-earmark-text"
            title="Tax & legal"
            subtitle="What the depot needs to pay you correctly"
            tone="emerald"
          >
            <ProfileField
              id="driverNiNumber"
              label="National Insurance number"
              value={profile.niNumber}
              onChange={(v) => setField("niNumber", formatNiNumber(v))}
              placeholder="QQ123456C"
            />
            <ProfileField
              id="driverUtr"
              label="UTR"
              value={profile.utr}
              onChange={(v) => setField("utr", digitsOnly(v, 10))}
              placeholder="10 digits"
              hint="Unique Taxpayer Reference, if self-employed"
            />
            <ProfileField
              id="driverCompanyName"
              label="Limited company"
              value={profile.companyName}
              onChange={(v) => setField("companyName", v)}
              placeholder="Leave empty if you invoice as a sole trader"
            />
            <ProfileField
              id="driverVatNumber"
              label="VAT number"
              value={profile.vatNumber}
              onChange={(v) => setField("vatNumber", v.toUpperCase())}
              placeholder="Only if VAT registered"
            />
          </ProfileSection>

          <ProfileSection
            icon="bi-card-heading"
            title="Driving licence"
            subtitle="Keep the expiry current — an out-of-date licence takes you off the rota"
            tone="sky"
          >
            <ProfileField
              id="driverLicenceNumber"
              label="Licence number"
              value={profile.licenceNumber}
              onChange={(v) => setField("licenceNumber", v.toUpperCase())}
            />
            <ProfileField
              id="driverLicenceExpiry"
              label="Expires"
              type="date"
              value={profile.licenceExpiry}
              onChange={(v) => setField("licenceExpiry", v)}
            />
            <ProfileField
              id="driverLicenceCategories"
              label="Categories"
              value={profile.licenceCategories}
              onChange={(v) => setField("licenceCategories", v.toUpperCase())}
              placeholder="B, BE"
              fullWidth
            />
          </ProfileSection>

          <ProfileSection
            icon="bi-building"
            title="Work details"
            subtitle="Set by your Service Provider — ask the depot to change these"
            tone="slate"
          >
            <ProfileField id="driverCompany" label="Company" value={MOCK_DRIVER_USER.companyName} readOnly />
            <ProfileField id="driverRole" label="Role" value="Driver" readOnly />
            <ProfileField id="driverType" label="Driver type" value={DRIVER_WORK_INFO.driverType} readOnly />
            <ProfileField id="driverRota" label="Rota" value={DRIVER_WORK_INFO.rota} readOnly />
            <ProfileField id="driverDepot" label="Depot" value={DRIVER_WORK_INFO.depot} readOnly />
            <ProfileField id="driverId" label="Driver ID" value={String(MOCK_DRIVER_USER.id)} readOnly />
          </ProfileSection>

          <div className={styles.actionBar}>
            <span className={dirty ? styles.actionNote : styles.actionNoteSaved}>
              <i className={`bi ${dirty ? "bi-pencil" : "bi-check2"}`} aria-hidden="true" />
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <button type="button" className={styles.resetButton} onClick={discard} disabled={!dirty}>
              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Discard
            </button>
            <button type="button" className={styles.saveButton} onClick={save} disabled={!dirty}>
              <i className="bi bi-check-lg" aria-hidden="true" /> Save changes
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`${styles.toast} ${toast.kind === "success" ? styles.toastSuccess : styles.toastError}`}
        >
          <i
            className={`bi ${toast.kind === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2`}
            aria-hidden="true"
          />
          {toast.message}
        </div>
      )}
    </StandardPageLayout>
  );
}
