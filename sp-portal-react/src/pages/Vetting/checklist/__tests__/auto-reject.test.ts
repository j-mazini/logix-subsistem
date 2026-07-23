/**
 * Vetting Pipeline §9 — non-waivable auto-reject gates.
 * Each gate: one passing case (no failure) and one tripping case (failure).
 */

import type { ChecklistCandidate } from '../modules/central-driver-record/model';
import type { AutoRejectCode } from '../modules/central-driver-record/auto-reject';
import { runAutoReject } from '../modules/central-driver-record/auto-reject';

type Docs = ChecklistCandidate['checklistDocs'];

function candidate(docs: Docs = {}, extra: Partial<ChecklistCandidate> = {}): ChecklistCandidate {
  return {
    id: 'c1',
    rawId: 'driver-1',
    name: 'Test Driver',
    source: 'drivers',
    status: 'INTAKE',
    employment: 'PAYE',
    suitability: '',
    startDate: '2026-07-01',
    checklistDocs: docs,
    ...extra,
  } as ChecklistCandidate;
}

function codes(c: ChecklistCandidate): AutoRejectCode[] {
  return runAutoReject(c).map((f) => f.code);
}

describe('auto-reject §9 gates', () => {
  it('a clean candidate trips no gates', () => {
    expect(runAutoReject(candidate())).toHaveLength(0);
  });

  describe('DBS_INVALID (B2–B4)', () => {
    it('rejects a non-accepted DBS source', () => {
      expect(codes(candidate({ uk_crc: { crc_type: 'Basic online check' } }))).toContain('DBS_INVALID');
    });
    it('rejects a certificate older than the 10-week window', () => {
      expect(codes(candidate({ uk_crc: { crc_issue_date: '2026-01-01' } }))).toContain('DBS_INVALID');
    });
    it('accepts a valid recent DBS', () => {
      expect(codes(candidate({ uk_crc: { crc_type: 'DBS (England/Wales)', crc_issue_date: '2026-06-15' } }))).not.toContain('DBS_INVALID');
    });
  });

  describe('RTW_UNRESOLVED (A4)', () => {
    it('rejects a rejected RTW review', () => {
      expect(codes(candidate({ rtw_doc: { rtw_review_status: 'Rejected' } }))).toContain('RTW_UNRESOLVED');
    });
    it('rejects a not-authorised pre-screen', () => {
      expect(codes(candidate({ rtw_prescreen: { rtw_status: 'Not Authorised — hard reject' } }))).toContain('RTW_UNRESOLVED');
    });
    it('accepts an authorised RTW', () => {
      expect(codes(candidate({ rtw_doc: { rtw_review_status: 'Accepted' } }))).not.toContain('RTW_UNRESOLVED');
    });
  });

  describe('HMRC_MISSING (non-PAYE)', () => {
    it('rejects self-employed without HMRC evidence', () => {
      expect(codes(candidate({}, { employment: 'Self-employed' }))).toContain('HMRC_MISSING');
    });
    it('accepts self-employed with HMRC evidence', () => {
      expect(codes(candidate({ hmrc_evidence: { hmrc_ref: 'UTR 1234567890' } }, { employment: 'Ltd' }))).not.toContain('HMRC_MISSING');
    });
    it('does not require HMRC for PAYE', () => {
      expect(codes(candidate({}, { employment: 'PAYE' }))).not.toContain('HMRC_MISSING');
    });
  });

  describe('ABROAD_NO_INTL_CRC (C5)', () => {
    it('rejects ineligible-for-DBS without International CRC', () => {
      expect(codes(candidate({ dbs_preliminary: { dbs_eligibility: 'Ineligible — refer to international CRC' } }))).toContain('ABROAD_NO_INTL_CRC');
    });
    it('accepts when International CRC is provided', () => {
      expect(
        codes(
          candidate({
            dbs_preliminary: { dbs_eligibility: 'Ineligible — refer to international CRC' },
            intl_crc: { intl_crc_countries: 'Italy 2021–2023' },
          }),
        ),
      ).not.toContain('ABROAD_NO_INTL_CRC');
    });
  });

  describe('DOC_INCONSISTENCY (C6)', () => {
    it('rejects a failed identity check', () => {
      expect(codes(candidate({ identity_check: { identity_result: 'Fail (< 70% — hard reject)' } }))).toContain('DOC_INCONSISTENCY');
    });
  });

  describe('GAP_NO_EVIDENCE (C4)', () => {
    it('rejects a failed VRA outcome', () => {
      expect(codes(candidate({ vra_form: { vra_outcome: 'Not acceptable — reject' } }))).toContain('GAP_NO_EVIDENCE');
    });
    it('accepts a mitigated VRA outcome', () => {
      expect(codes(candidate({ vra_form: { vra_outcome: 'Accepted — risk mitigated' } }))).not.toContain('GAP_NO_EVIDENCE');
    });
  });

  describe('NO_INTERVIEW_OR_DECLARATION', () => {
    it('rejects a failed interview', () => {
      expect(codes(candidate({ interview_record: { int_outcome: 'Fail' } }))).toContain('NO_INTERVIEW_OR_DECLARATION');
    });
    it('rejects a Not Suitable assessment', () => {
      expect(codes(candidate({}, { suitability: 'Not Suitable' }))).toContain('NO_INTERVIEW_OR_DECLARATION');
    });
  });
});
