'use client';

import Image from '../../shims/image';
import Link from '../../shims/link';
import { usePathname, useRouter } from '../../shims/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, type DocumentData } from '../../shims/firestore';
import { db } from '../../shims/firebase';
import { useAuth } from '../../shims/AuthContext';
import { useAdminCandidate } from './AdminCandidateContext';
import styles from './AdminNavbar.module.css';

const NAV_LINKS = [
  { href: '/vetting-dashboard', label: 'Vetting' },
  { href: '/vetting-checklist', label: 'Checklist' },
  { href: '/vetting-interview', label: 'Knowledge test' },
];

/** Routes that operate on a single applicant and need the picker. */
const CANDIDATE_ROUTES = ['/vetting-checklist', '/vetting-interview'];

interface CandidateOption {
  id: string;
  name: string;
}

function driverName(data: DocumentData): string {
  return data.personalInfo?.fullName ?? data.fullName ?? 'Unnamed candidate';
}

/** Shared top navigation for all /admin pages. */
export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { selectedId, setSelectedId } = useAdminCandidate();
  const [options, setOptions] = useState<CandidateOption[]>([]);

  const showCandidateSelect = CANDIDATE_ROUTES.some((route) => pathname?.startsWith(route));

  // Adopt a deep-linked ?candidate= so the select reflects the open applicant.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search || (window.location.hash.split('?')[1] ?? '')).get('candidate');
    if (fromUrl) setSelectedId(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lightweight name/id subscription — same id scheme the pages use
  // (`driver-<id>` / `legacy-<id>`), so selection transfers directly.
  useEffect(() => {
    if (!isAuthenticated || !showCandidateSelect) return;

    let drivers: CandidateOption[] = [];
    let legacy: CandidateOption[] = [];
    const publish = () =>
      setOptions(
        [...drivers, ...legacy].sort((a, b) => a.name.localeCompare(b.name)),
      );

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      drivers = snap.docs.map((d) => ({ id: `driver-${d.id}`, name: driverName(d.data()) }));
      publish();
    });
    const unsubLegacy = onSnapshot(
      collection(db, 'workspaces', 'ba-express-vetting', 'vendors'),
      (snap) => {
        legacy = snap.docs.map((d) => ({
          id: `legacy-${d.id}`,
          name: d.data().name ?? d.data().fullName ?? 'Unnamed candidate',
        }));
        publish();
      },
    );

    return () => {
      unsubDrivers();
      unsubLegacy();
    };
  }, [isAuthenticated, showCandidateSelect]);

  const selectValue = useMemo(
    () => (selectedId && options.some((o) => o.id === selectedId) ? selectedId : ''),
    [selectedId, options],
  );

  const handleCandidateChange = (id: string) => {
    setSelectedId(id || null);
    // Keep the URL shareable/deep-linkable without a full navigation.
    const url = id ? `${pathname}?candidate=${encodeURIComponent(id)}` : pathname ?? '';
    window.history.replaceState(null, '', url);
  };

  /** Carry the current applicant across the candidate-scoped sections. */
  const hrefFor = (base: string) =>
    CANDIDATE_ROUTES.includes(base) && selectedId
      ? `${base}?candidate=${encodeURIComponent(selectedId)}`
      : base;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <header className={styles.navbar}>
      <Link href="/vetting-dashboard" className={styles.brand} aria-label="BA Express — Admin home">
        <Image
          src="https://baexpress.co.uk/assets/logo-ba.png"
          alt=""
          width={36}
          height={36}
          unoptimized
        />
        <span className={styles.brandName}>BA Express</span>
        <span className={styles.brandBadge}>Admin</span>
      </Link>

      <nav className={styles.nav} aria-label="Admin sections">
        {NAV_LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={hrefFor(link.href)}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {showCandidateSelect && (
        <select
          className={styles.candidateSelect}
          value={selectValue}
          onChange={(e) => handleCandidateChange(e.target.value)}
          aria-label="Applicant"
        >
          <option value="" disabled>
            {options.length ? 'Select applicant…' : 'Loading applicants…'}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      )}

      <div className={styles.user}>
        {user?.photoURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className={styles.avatar} />
        )}
        <span className={styles.userName}>{user?.displayName}</span>
        <button type="button" onClick={handleSignOut} className={styles.signOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
