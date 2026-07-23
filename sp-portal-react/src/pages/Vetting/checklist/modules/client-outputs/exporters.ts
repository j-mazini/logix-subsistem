import { CHECKLIST_STEPS } from "../../data/checklist";
import type { ChecklistCandidate } from "../central-driver-record/model";
import {
  DOC_ITEMS,
  NEXT_ITEMS,
  REDFLAG_ITEMS,
  autoInterviewDecision,
  interviewScore,
} from "../interview/model";

type ExportKind = "initial" | "suitability" | "interview" | "dhl" | "report";

type SignatureBlock = {
  name: string;
  role: string;
  signedValue?: string;
  date?: string;
};
type ExportSection = {
  heading: string;
  lines: string[];
  pageBreakBefore?: boolean;
  signatures?: SignatureBlock[];
};
type DhlExportOptions = {
  includeSuitability?: boolean;
  includeInterviewNotes?: boolean;
  signerName?: string;
};
const RECRUITMENT_STEP_TITLES = [
  "Driver Registration & Application Form",
];
const DHL_READY_STEP_TITLES = [
  "Driver Registration & Application Form",
  "Interview",
  "Suitability Assessment",
  "Scoring & Decision",
  "Work References & DBS",
];

export async function exportCandidate(
  kind: ExportKind,
  candidate: ChecklistCandidate,
  options: DhlExportOptions = {},
) {
  const title =
    kind === "initial"
      ? "BA EXPRESS - INITIAL INFORMATION REVIEW"
      : kind === "suitability"
      ? "BA EXPRESS - SUITABILITY ASSESSMENT"
      : kind === "interview"
        ? "BA EXPRESS - FACE-TO-FACE INTERVIEW NOTES"
        : kind === "dhl"
          ? "BA EXPRESS - DHL HANDOFF DOCUMENTS"
          : "BA EXPRESS - DRIVER VETTING CASE REPORT";

  const sections =
    kind === "initial"
      ? initialReviewSections(candidate)
      : kind === "suitability"
      ? suitabilitySections(candidate)
      : kind === "interview"
        ? interviewSections(candidate)
        : kind === "dhl"
          ? dhlHandoffSections(candidate, options)
          : reportSections(candidate);

  const filename =
    kind === "dhl"
      ? `DHL_Handoff_${slug(candidate.name)}_${today()}.pdf`
      : `${slug(title)}_${slug(candidate.name)}_${today()}.pdf`;
  try {
    await downloadPdf(title, sections, filename);
  } catch (error) {
    console.error("PDF export failed, opening printable fallback:", error);
    openPrintablePdf(title, sections, filename);
  }
}

function initialReviewSections(candidate: ChecklistCandidate): ExportSection[] {
  const roleType = candidate.checklistDocs.role_type ?? {};
  const ageCheck = candidate.checklistDocs.age_check ?? {};
  const applicationForm = candidate.checklistDocs.application_form ?? {};
  const baseline = candidate.checklistDocs.registration_baseline ?? {};
  const rtw = candidate.checklistDocs.rtw_doc ?? {};
  const dvla = candidate.checklistDocs.dvla_doc ?? {};

  return [
    {
      heading: "Application Form",
      lines: [
        `Signature status: ${applicationForm.signature_status || applicationForm.__documentStatus || "-"}`,
        `Signed on: ${formatDate(applicationForm.signed_at)}`,
        `Signer email: ${applicationForm.signer_email || candidate.email || "-"}`,
      ],
    },
    {
      heading: "Application Form Data",
      lines: [
        `Name: ${candidate.name || baseline.full_name || "-"}`,
        `Phone: ${candidate.phone || baseline.phone || "-"}`,
        `E-mail: ${candidate.email || baseline.email || "-"}`,
        `Role Type: ${roleType.role_selected || baseline.role_type || candidate.role || "-"}`,
        `Date of Birth: ${formatDate(candidate.dob || baseline.date_of_birth)}`,
        `UK Postcode: ${candidate.postcode || baseline.uk_postcode || "-"}`,
        `Address: ${candidate.address || baseline.address || "-"}`,
        `National Insurance Number: ${candidate.nin || baseline.national_insurance_number || "-"}`,
        `Right to Work: ${rtw.rtw_type || baseline.right_to_work || "-"}`,
        `DVLA Share Code: ${
          candidate.role === "Bicycle Courier"
            ? "Not required - Bike"
            : dvla.dvla_share_code || baseline.dvla_share_code || "-"
        }`,
        `Age gate result: ${ageCheck.age_gate_result || "-"}`,
      ],
    },
  ];
}

function reportSections(candidate: ChecklistCandidate) {
  return [
    ...caseHeaderSections(candidate),
    ...checklistSections(candidate),
    ...documentSections(candidate),
    ...interviewSections(candidate),
    {
      heading: "Case Notes",
      lines: [candidate.caseNotes || "-"],
    },
  ];
}

function suitabilitySections(candidate: ChecklistCandidate) {
  const score = interviewScore(candidate.interview);
  const auto = autoInterviewDecision(score, candidate.interview);
  return [
    ...caseHeaderSections(candidate),
    {
      heading: "Suitability Decision",
      lines: [
        `Interview outcome: ${candidate.interview.outcome || "not assessed"}`,
        `Interview score: ${score}/50`,
        `Recommendation: ${auto.label}`,
        `Formal decision: ${decisionLabel(candidate.interview.decision)}`,
        `Conditions: ${candidate.interview.conditions || "-"}`,
      ],
    },
    {
      heading: "Recruiting Manager Declaration",
      lines: [
        `I confirm that I have reviewed the evidence on file, the 5-year history, and the interview assessment for ${candidate.name}.`,
        "No driver may start until full vetting is completed, originals are checked, and DHL has confirmed the case is acceptable.",
      ],
      signatures: [
        {
          name: candidate.interview.interviewer || candidate.owner || "",
          role: "HR / Recruiting Manager",
          signedValue: candidate.interview.hrSig,
        },
        {
          name: candidate.interview.supervisorName || "",
          role: "Direct Supervisor",
          signedValue: candidate.interview.supervisorSig,
        },
      ],
    },
  ];
}

function dhlHandoffSections(
  candidate: ChecklistCandidate,
  options: DhlExportOptions = {},
) {
  const includeSuitability = options.includeSuitability ?? true;
  const includeInterviewNotes = options.includeInterviewNotes ?? false;
  const signerName =
    options.signerName?.trim() ||
    candidate.owner ||
    candidate.interview.supervisorName ||
    "";
  const sections: ExportSection[] = [];

  if (includeSuitability)
    sections.push(...dhlSuitabilitySections(candidate, signerName));
  if (includeInterviewNotes)
    sections.push(dhlInterviewNotesSection(candidate, signerName));

  return sections.length
    ? sections
    : dhlSuitabilitySections(candidate, signerName);
}

function dhlSuitabilitySections(
  candidate: ChecklistCandidate,
  signerName: string,
) {
  const iv = candidate.interview;
  const score = interviewScore(iv);
  const auto = autoInterviewDecision(score, iv);
  const riskLevel = docValue(candidate, "compliance_triage", "riskLevel");
  const missingItems = docValue(candidate, "compliance_triage", "missingItems");
  const startDecision = docValue(
    candidate,
    "compliance_triage",
    "startDecision",
  );
  const flagged = REDFLAG_ITEMS.filter((_, index) => iv.redFlags[index]);
  const readiness = [
    [
      "Core evidence pack complete",
      stepsComplete(candidate, DHL_READY_STEP_TITLES),
    ],
    [
      "Red flags & evidence quality gate cleared",
      stepComplete(candidate, "Suitability Assessment"),
    ],
    [
      "Interview documented and suitability declaration signed",
      stepComplete(candidate, "Interview"),
    ],
    ["Compliance triage complete", Boolean(riskLevel || startDecision)],
    [
      "APHIDS submission recorded",
      Boolean(
        docValue(candidate, "aphids", "aphids_date") ||
        docValue(candidate, "aphids", "aphids_ref"),
      ),
    ],
  ] as const;
  const allReady = readiness.every(([, ok]) => ok);

  return [
    {
      heading: "Case Header",
      lines: [
        `Candidate: ${candidate.name}`,
        `Role: ${candidate.role || "-"} · Depot: ${candidate.depot || "-"} · Employment: ${candidate.employment || "-"}`,
        `Date of birth: ${formatDate(candidate.dob)} · Nationality: ${candidate.nationality || "-"}`,
        `Current address: ${candidate.address || "-"}`,
        `Proposed start: ${formatDate(candidate.startDate)} · Case owner: ${candidate.owner || "-"} · Case opened: ${formatDate(candidate.updatedAt)}`,
        `Assessment date: ${formatDate(new Date().toISOString())}`,
      ],
    },
    {
      heading: "1. Evidence Checklist",
      lines: [
        "Classification per SOP §7.1 - Compliant: evidence complete and aligned with DHL rules · Missing: required evidence not yet provided.",
        ...itemLines(candidate, [
          ...RECRUITMENT_STEP_TITLES,
          "Interview",
          "Suitability Assessment",
          "Scoring & Decision",
          "Work References & DBS",
        ]),
      ],
    },
    {
      heading: "2. Interview & Suitability Evidence",
      lines: [
        ...itemLines(candidate, ["Interview"]),
        `Interview outcome: ${iv.outcome || "not assessed"} · Score: ${score}/50 · ${auto.label}`,
        `Formal decision: ${decisionLabel(iv.decision)}`,
        `Conditions: ${iv.conditions || "-"}`,
      ],
    },
    {
      heading: "3. 5-Year History Review",
      lines: [
        "Review note: 5-year history is recorded for visibility. Gaps of 28 days or more are flagged for review and do not block progression.",
        ...filteredItemLines(
          candidate,
          ["Suitability Assessment", "Work References & DBS"],
          ["5-year", "reference", "gap", "history"],
        ),
      ],
    },
    {
      heading: "4. Risk Assessment",
      lines: [
        `Risk level (SOP §7.2): ${riskLevel || "- not assigned -"}`,
        riskDescription(riskLevel),
        `Missing / weak items: ${missingItems || "-"}`,
        `Unresolved red-flag / quality-gate items: ${stepComplete(candidate, "Suitability Assessment") ? "none" : "open items remain - hard stop, case NOT ready for DHL (SOP §7.4)"}`,
        `Interview red flags: ${flagged.length ? `${flagged.length} - ${flagged.join("; ")}` : "none raised"}`,
      ],
    },
    {
      heading: "5. Start Decision",
      lines: [
        `Start decision (SOP §7.3): ${startDecision || "- not recorded -"}`,
        startDecisionDescription(startDecision),
      ],
    },
    {
      heading: "6. DHL Handoff Readiness",
      lines: readiness
        .map(([label, ok]) => `${ok ? "[x]" : "[ ]"} ${label}`)
        .concat(
          allReady
            ? "READY FOR DHL REVIEW - present originals in person to the DHL Service Centre Manager."
            : 'NOT READY - resolve the unticked items before presenting to DHL. "Sent to DHL" does not mean "approved by DHL".',
        ),
    },
    {
      heading: "7. Recruiting Manager's Formal Declaration",
      lines: [
        `I confirm that I have reviewed the evidence on file, the 5-year history, and the interview assessment for ${candidate.name}. I am satisfied that the candidate is suitable to work on the DHL contract, subject to DHL's own review and written confirmation of acceptance. I understand that no driver may start until full vetting is completed, originals are checked, and DHL has confirmed the case is acceptable.`,
      ],
      signatures: [
        {
          name: signerName || iv.supervisorName || "",
          role: "Recruiting Manager",
          signedValue: iv.supervisorSig,
        },
      ],
    },
    {
      heading: "Document Control",
      lines: [
        `Candidate: ${candidate.name}`,
        `Exported by / signer: ${signerName || "-"}`,
        `Exported at: ${new Date().toLocaleString("en-GB")}`,
        "Basis: BA Express Driver Vetting SOP v2.0 - BA Express Suitability Assessment, completed by the compliance team before DHL handoff.",
      ],
    },
  ];
}

function dhlInterviewNotesSection(
  candidate: ChecklistCandidate,
  signerName: string,
) {
  return {
    heading: "Interview Notes",
    pageBreakBefore: true,
    lines: [
      `Candidate: ${candidate.name}`,
      `Interview date: ${candidate.interview.date || "-"}`,
      `Recorded by / signer: ${signerName || candidate.interview.interviewer || candidate.owner || "-"}`,
      " ",
      candidate.interview.notes || "-",
    ],
  };
}

function interviewSections(candidate: ChecklistCandidate) {
  const iv = candidate.interview;
  const score = interviewScore(iv);
  const flagged = REDFLAG_ITEMS.filter((_, index) => iv.redFlags[index]);
  const docs = DOC_ITEMS.map((item, index) => {
    const checked = iv.docChecks[index] ? "[x]" : "[ ]";
    const expiry = iv.docExpiry[index]
      ? ` - expiry: ${iv.docExpiry[index]}`
      : "";
    return `${checked} ${item}${expiry}`;
  });
  const nextSteps = NEXT_ITEMS.filter((_, index) => iv.nextSteps[index]);

  return [
    {
      heading: "Interview Record",
      lines: [
        `Date: ${iv.date || "-"} ${iv.startTime || ""}`.trim(),
        `HR Interviewer: ${iv.interviewer || "-"}`,
        `Direct Supervisor: ${iv.supervisorName || "-"}`,
        `Location: ${iv.location || "-"}`,
        `Outcome: ${iv.outcome || "not assessed"}`,
        `Notes: ${iv.notes || "-"}`,
      ],
    },
    {
      heading: "Interview Observations",
      lines: [
        `Strengths: ${iv.strengths || "-"}`,
        `Areas for development: ${iv.development || "-"}`,
        `Questions asked by candidate: ${iv.candidateQuestions || "-"}`,
        `Overall impression: ${iv.overall || "-"}`,
      ],
    },
    {
      heading: "Scoring",
      lines: [
        `Total score: ${score}/50`,
        `Auto recommendation: ${autoInterviewDecision(score, iv).label}`,
      ],
    },
    {
      heading: "Interview Document Collection",
      lines: docs.concat(
        iv.docNotes ? [`Verification notes: ${iv.docNotes}`] : [],
      ),
    },
    {
      heading: "Red Flags",
      lines: flagged.length ? flagged : ["None raised"],
    },
    {
      heading: "Decision",
      lines: [
        `Formal decision: ${decisionLabel(iv.decision)}`,
        `Next steps: ${nextSteps.length ? nextSteps.join("; ") : "-"}`,
        `Red flag notes: ${iv.redFlagNotes || "-"}`,
      ],
    },
  ];
}

function checklistSections(candidate: ChecklistCandidate) {
  let offset = 0;
  return CHECKLIST_STEPS.map((step) => {
    const lines = step.items
      .map((item, index) => {
        if (item.hidden) return "";
        const checked = candidate.checks[offset + index] ? "[x]" : "[ ]";
        return `${checked} ${item.title}`;
      })
      .filter(Boolean);
    offset += step.items.length;
    return {
      heading: `${step.title} (${step.sla || "no SLA"})`,
      lines,
    };
  });
}

function documentSections(candidate: ChecklistCandidate) {
  const docs = Object.entries(candidate.checklistDocs)
    .filter(([, fields]) => Object.values(fields).some(Boolean))
    .map(([key, fields]) => {
      const details = Object.entries(fields)
        .filter(([, value]) => value)
        .map(([field, value]) => `${field}: ${value}`)
        .join(" | ");
      return `${key}: ${details}`;
    });

  return [
    {
      heading: "Registered Documents",
      lines: docs.length ? docs : ["No document registrations recorded."],
    },
  ];
}

function itemLines(candidate: ChecklistCandidate, stepTitles: string[]) {
  let offset = 0;
  const lines: string[] = [];

  CHECKLIST_STEPS.forEach((step) => {
    const base = offset;
    offset += step.items.length;
    if (!stepTitles.includes(step.title)) return;

    step.items.forEach((item, index) => {
      if (item.hidden) return;
      const ok = candidate.checks[base + index];
      lines.push(
        `${ok ? "[x]" : "[ ]"} ${item.title} - ${ok ? "Compliant" : "Missing"}`,
      );

      if (!item.docKey) return;
      item.docFields?.forEach((field) => {
        const value = docValue(candidate, item.docKey!, field.key);
        if (value)
          lines.push(
            `  ${field.label}: ${formatFieldValue(field.type, value)}`,
          );
      });

      const registration = candidate.checklistDocs[item.docKey];
      if (registration?.__documentStatus)
        lines.push(`  Document status: ${registration.__documentStatus}`);
      if (registration?.__fileName)
        lines.push(`  File name: ${registration.__fileName}`);
      if (registration?.__driveUrl)
        lines.push(`  Drive URL: ${registration.__driveUrl}`);
      if (registration?.__sentToFolder)
        lines.push(`  Sent to folder: ${registration.__sentToFolder}`);
      if (registration?.__receivedDate)
        lines.push(
          `  Received date: ${formatDate(registration.__receivedDate)}`,
        );
      if (registration?.__documentNotes)
        lines.push(`  Notes: ${registration.__documentNotes}`);
    });
  });

  return lines;
}

function filteredItemLines(
  candidate: ChecklistCandidate,
  stepTitles: string[],
  keywords: string[],
) {
  const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
  let offset = 0;
  const lines: string[] = [];

  CHECKLIST_STEPS.forEach((step) => {
    const base = offset;
    offset += step.items.length;
    if (!stepTitles.includes(step.title)) return;

    step.items.forEach((item, index) => {
      if (item.hidden) return;
      const haystack = `${item.title} ${item.detail || ""}`.toLowerCase();
      if (!lowerKeywords.some((keyword) => haystack.includes(keyword))) return;
      const ok = candidate.checks[base + index];
      lines.push(
        `${ok ? "[x]" : "[ ]"} ${item.title} - ${ok ? "Compliant" : "Missing"}`,
      );
      if (!item.docKey) return;
      item.docFields?.forEach((field) => {
        const value = docValue(candidate, item.docKey!, field.key);
        if (value)
          lines.push(
            `  ${field.label}: ${formatFieldValue(field.type, value)}`,
          );
      });
    });
  });

  return lines.length ? lines : ["No 5-year history evidence recorded."];
}

function stepComplete(candidate: ChecklistCandidate, stepTitle: string) {
  let offset = 0;
  for (const step of CHECKLIST_STEPS) {
    const base = offset;
    offset += step.items.length;
    if (step.title !== stepTitle) continue;
    return step.items.every((_, index) => candidate.checks[base + index]);
  }
  return false;
}

function stepsComplete(candidate: ChecklistCandidate, stepTitles: string[]) {
  return stepTitles.every((title) => stepComplete(candidate, title));
}

function docValue(
  candidate: ChecklistCandidate,
  docKey: string,
  fieldKey: string,
) {
  return candidate.checklistDocs[docKey]?.[fieldKey] || "";
}

function formatFieldValue(type: string, value: string) {
  return type === "date" ? formatDate(value) : value;
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB");
}

function riskDescription(value: string) {
  if (value === "Low")
    return "File appears complete and ready for DHL. No unresolved issues.";
  if (value === "Medium")
    return "Potentially workable, but missing items or clarifications remain. Resolve before presenting to DHL.";
  if (value === "High")
    return "Serious gap, missing critical evidence, or the driver should not start. Escalate immediately.";
  return "-";
}

function startDecisionDescription(value: string) {
  if (value === "Yes")
    return "Full vetting complete. DHL has confirmed acceptance. Driver may start.";
  if (value === "No")
    return "Critical failure. Evidence cannot support clearance. Do not present to DHL.";
  if (value === "Not yet")
    return "Evidence is incomplete but resolvable. Case is not ready for DHL review.";
  if (value === "Only with documented DHL exception")
    return "Evidence has a known weakness. Present to DHL with full disclosure and let DHL decide.";
  return "-";
}

function caseHeaderSections(candidate: ChecklistCandidate) {
  return [
    {
      heading: "Candidate",
      lines: [
        `Name: ${candidate.name}`,
        `Email: ${candidate.email || "-"}`,
        `Role: ${candidate.role || "-"}`,
        `Depot: ${candidate.depot || "-"}`,
        `Employment: ${candidate.employment || "-"}`,
        `Nationality: ${candidate.nationality || "-"}`,
        `DOB: ${candidate.dob || "-"}`,
        `Address: ${candidate.address || "-"}`,
        `Proposed start: ${candidate.startDate || "-"}`,
        `Case owner: ${candidate.owner || "-"}`,
        `Drive folder: ${candidate.driveFolderUrl || "-"}`,
        `Status: ${candidate.status}`,
      ],
    },
  ];
}

function decisionLabel(value: string) {
  if (value === "hire-strong") return "HIRE - Strong Candidate";
  if (value === "hire-cond") return "HIRE - Conditional";
  if (value === "second") return "Second Interview Required";
  if (value === "decline") return "DECLINE";
  return "- not yet decided -";
}

async function downloadPdf(
  title: string,
  sections: ExportSection[],
  filename: string,
) {
  const jsPDF = await loadJsPdf();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logoDataUrl = await loadImageDataUrl("/assets/logo-ba.png");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const pdfSafe = (value: string) =>
    String(value || "-").replace(
      /[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D]/g,
      "",
    );

  const pageDecor = () => {
    const bands = 60;
    for (let i = 0; i < bands; i += 1) {
      const t = i / (bands - 1);
      const [from, to, u] =
        t < 0.45
          ? [[253, 253, 254], [241, 244, 248], t / 0.45]
          : [[241, 244, 248], [233, 238, 245], (t - 0.45) / 0.55];
      doc.setFillColor(
        lerp(from[0], to[0], u),
        lerp(from[1], to[1], u),
        lerp(from[2], to[2], u),
      );
      doc.rect(
        0,
        (pageHeight * i) / bands - 0.5,
        pageWidth,
        pageHeight / bands + 1,
        "F",
      );
    }

    const segments = 48;
    for (let i = 0; i < segments; i += 1) {
      const u = i / (segments - 1);
      doc.setFillColor(lerp(214, 46, u), lerp(55, 65, u), lerp(44, 86, u));
      doc.rect(
        (pageWidth * i) / segments - 0.5,
        0,
        pageWidth / segments + 1,
        6,
        "F",
      );
    }
  };

  const addPageIfNeeded = (height = 18) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    pageDecor();
    y = margin;
  };

  const marker = (text: string) => {
    const match = /^\[([x !])\] /.exec(text);
    return match ? { kind: match[1], rest: text.slice(4) } : null;
  };

  const kvPairs = (text: string) => {
    const pairs: Array<[string, string]> = [];
    for (const segment of text.split(" · ")) {
      const match = /^([^:—·]{2,48}): (.+)$/.exec(segment);
      if (!match) return null;
      pairs.push([match[1], match[2]]);
    }
    return pairs.length ? pairs : null;
  };

  const drawMarker = (kind: string, x: number, baseline: number) => {
    const size = 7.5;
    const top = baseline - size + 1;
    if (kind === "x") {
      doc.setFillColor(46, 65, 86);
      doc.roundedRect(x, top, size, size, 1.5, 1.5, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.line(x + 1.8, top + size / 2, x + size / 2 - 0.4, top + size - 2);
      doc.line(x + size / 2 - 0.4, top + size - 2, x + size - 1.6, top + 1.8);
      return;
    }
    if (kind === "!") {
      doc.setFillColor(191, 29, 35);
      doc.roundedRect(x, top, size, size, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("!", x + size / 2, baseline - 1, { align: "center" });
      return;
    }
    doc.setDrawColor(160, 170, 182);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, top, size, size, 1.5, 1.5, "S");
  };

  const addText = (
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      gap?: number;
      dim?: boolean;
      indent?: number;
    } = {},
  ) => {
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    const mark = marker(text);
    const pairs = !mark && !options.dim ? kvPairs(text) : null;

    if (pairs) {
      pairs.forEach(([label, value]) => {
        const labelX = margin + indent;
        const valueX = labelX + 132;
        const labelLines = doc.splitTextToSize(
          pdfSafe(label).toUpperCase(),
          valueX - labelX - 10,
        );
        const valueLines = doc.splitTextToSize(
          pdfSafe(value),
          pageWidth - margin - valueX,
        );
        const rows = Math.max(labelLines.length, valueLines.length);
        addPageIfNeeded(rows * 13);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.setTextColor(125, 135, 148);
        labelLines.forEach((line: string, index: number) =>
          doc.text(line, labelX, y + index * 13),
        );
        doc.setFont("helvetica", options.bold ? "bold" : "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...(options.color ?? [45, 57, 70]));
        valueLines.forEach((line: string, index: number) =>
          doc.text(line, valueX, y + index * 13),
        );
        y += rows * 13;
      });
      y += options.gap ?? 0;
      return;
    }

    const textX = margin + indent + (mark ? 12 : 0);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(
      ...(options.color ?? (options.dim ? [125, 135, 148] : [45, 57, 70])),
    );
    const lines = doc.splitTextToSize(
      pdfSafe(mark ? mark.rest : text),
      pageWidth - margin - textX,
    );
    lines.forEach((line: string, index: number) => {
      addPageIfNeeded(size + 6);
      if (mark && index === 0) drawMarker(mark.kind, margin + indent, y);
      doc.setFont("helvetica", options.bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(
        ...(options.color ?? (options.dim ? [125, 135, 148] : [45, 57, 70])),
      );
      doc.text(line, textX, y);
      y += size + 5;
    });
    y += options.gap ?? 2;
  };

  const addSignatures = (signatures: SignatureBlock[]) => {
    const gap = 14;
    const blockWidth = (contentWidth - gap) / 2;
    const blockHeight = 92;

    signatures.forEach((signature, index) => {
      if (index % 2 === 0) addPageIfNeeded(blockHeight + 16);
      const column = index % 2;
      const x = margin + column * (blockWidth + gap);
      const blockY = y;

      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(214, 219, 226);
      doc.roundedRect(x, blockY, blockWidth, blockHeight, 7, 7, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(41, 54, 71);
      doc.text(
        signature.name || "Name: __________________________",
        x + 12,
        blockY + 18,
        {
          maxWidth: blockWidth - 24,
        },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(102, 112, 133);
      doc.text(signature.role, x + 12, blockY + 31);

      doc.setDrawColor(102, 112, 133);
      doc.line(x + 12, blockY + 62, x + blockWidth - 12, blockY + 62);
      doc.setFontSize(7);
      doc.text("SIGNATURE", x + 12, blockY + 72);
      if (signature.signedValue) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(41, 54, 71);
        doc.text(signature.signedValue, x + 12, blockY + 57, {
          maxWidth: blockWidth - 24,
        });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(102, 112, 133);
      doc.text(
        `DATE: ${signature.date || "____ / ____ / ______"}`,
        x + blockWidth - 12,
        blockY + 82,
        {
          align: "right",
        },
      );

      if (column === 1 || index === signatures.length - 1)
        y += blockHeight + 16;
    });
  };

  pageDecor();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 28, 86, 86);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(125, 135, 148);
  doc.text("BA Express Compliance", pageWidth - margin, 40, { align: "right" });
  doc.text(
    `Generated ${new Date().toLocaleString("en-GB")}`,
    pageWidth - margin,
    52,
    { align: "right" },
  );
  doc.text("Driver Vetting SOP v2.0", pageWidth - margin, 64, {
    align: "right",
  });
  y = logoDataUrl ? 140 : 96;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(34, 48, 63);
  doc.text(pdfSafe(title), margin, y, { maxWidth: contentWidth });
  y += 7;
  doc.setDrawColor(214, 55, 44);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 170, y);
  doc.setDrawColor(46, 65, 86);
  doc.setLineWidth(0.6);
  doc.line(margin + 170, y, pageWidth - margin, y);
  y += 16;

  sections.forEach((section, index) => {
    if (section.pageBreakBefore && index > 0) {
      doc.addPage();
      pageDecor();
      y = margin;
    }
    if (section.heading) {
      addPageIfNeeded(48);
      y += 10;
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y - 11, contentWidth, 16, "F");
      doc.setFillColor(214, 55, 44);
      doc.rect(margin, y - 11, 3, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(46, 65, 86);
      doc.text(pdfSafe(section.heading.toUpperCase()), margin + 9, y, {
        maxWidth: contentWidth - 18,
      });
      y += 16;
    }
    section.lines.forEach((line) => addText(line, { size: 9.5 }));
    if (section.signatures?.length) addSignatures(section.signatures);
    y += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 112, 133);
    doc.text("BA Express Driver Operating System", margin, pageHeight - 24);
    doc.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 24,
      { align: "right" },
    );
  }

  doc.save(filename);
}

async function loadImageDataUrl(path: string) {
  try {
    const response = await fetch(path);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load PDF logo:", error);
    return "";
  }
}

async function loadJsPdf() {
  const win = window as Window & {
    jspdf?: { jsPDF: new (...args: unknown[]) => any };
  };
  if (win.jspdf?.jsPDF) return win.jspdf.jsPDF;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-jspdf-loader="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load jsPDF.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    script.dataset.jspdfLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load jsPDF."));
    document.head.appendChild(script);
  });

  if (!win.jspdf?.jsPDF) throw new Error("jsPDF did not initialize.");
  return win.jspdf.jsPDF;
}

function openPrintablePdf(
  title: string,
  sections: ExportSection[],
  filename: string,
) {
  const printable = window.open("", "_blank", "noopener,noreferrer");
  if (!printable) return;
  printable.document.write(`<!doctype html>
<html>
<head>
  <title>${escapeHtml(filename)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body {
      font-family: Arial, sans-serif;
      color: #2d3946;
      margin: 0;
      line-height: 1.45;
      background: linear-gradient(180deg, #fdfdfe 0%, #f1f4f8 45%, #e9eef5 100%);
      border-top: 6px solid #d6372c;
    }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 22px 0 18px; margin-bottom: 18px; }
    .brand-box { width: 86px; height: 86px; display: grid; place-items: center; flex: 0 0 auto; }
    .brand { width: 86px; height: 86px; object-fit: contain; }
    h1 { color: #22303f; font-size: 20px; margin: 0 0 8px; padding-bottom: 8px; border-bottom: 2px solid #d6372c; }
    .meta { color: #7d8794; font-size: 10px; text-align: right; }
    section { break-inside: avoid; margin: 0 0 18px; }
    section.page-break { break-before: page; page-break-before: always; }
    h2 {
      background: #e2e8f0;
      border-left: 3px solid #d6372c;
      color: #2e4156;
      font-size: 11px;
      letter-spacing: .04em;
      text-transform: uppercase;
      margin: 0 0 8px;
      padding: 4px 9px;
    }
    p { font-size: 11px; margin: 0 0 5px; white-space: pre-wrap; }
    .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
    .signature { min-height: 92px; padding: 12px; border: 1px solid #d6dbe2; border-radius: 8px; background: #f9fafb; break-inside: avoid; }
    .signature-name { min-height: 18px; font-size: 11px; font-weight: 700; }
    .signature-role { color: #667085; font-size: 9px; text-transform: uppercase; }
    .signature-line { height: 28px; margin-top: 8px; border-bottom: 1px solid #667085; font-size: 13px; font-style: italic; }
    .signature-meta { display: flex; justify-content: space-between; gap: 10px; margin-top: 5px; color: #667085; font-size: 8px; text-transform: uppercase; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Generated ${escapeHtml(new Date().toLocaleString("en-GB"))} · Save as PDF</div>
    </div>
    <div class="brand-box"><img class="brand" src="/assets/logo-ba.png" alt="BA Express" /></div>
  </header>
  ${sections.map((section) => `<section class="${section.pageBreakBefore ? "page-break" : ""}"><h2>${escapeHtml(section.heading)}</h2>${section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${section.signatures?.length ? `<div class="signatures">${section.signatures.map((signature) => `<div class="signature"><div class="signature-name">${escapeHtml(signature.name || "Name: __________________________")}</div><div class="signature-role">${escapeHtml(signature.role)}</div><div class="signature-line">${escapeHtml(signature.signedValue || "")}</div><div class="signature-meta"><span>Signature</span><span>Date: ${escapeHtml(signature.date || "____ / ____ / ______")}</span></div></div>`).join("")}</div>` : ""}</section>`).join("")}
  <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
</body>
</html>`);
  printable.document.close();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
