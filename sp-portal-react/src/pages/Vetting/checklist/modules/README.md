# BA Express Driver Operating System modules

Source architecture: `projetos/ba-express-dos-prototipo/docs/BA_Express_Strategic_Blueprint_v2.html`.

This checklist page follows the blueprint by keeping the page as an orchestration layer and moving business areas into modules:

- `central-driver-record/`: the single source of truth for candidate data loaded from Firestore. It normalizes current `drivers` records and legacy vendor records into one `ChecklistCandidate` shape.
- `interview/`: face-to-face interview evidence, scoring, document sighting, red flags, suitability decision and next steps.

Expected next module boundaries from the blueprint:

- `application/`: public application form and pre-screen rules.
- `client-outputs/`: DHL Vetting Form, APHIDS and future Amazon/FedEx/UPS outputs.
- `lifecycle/`: DVLA, CRC, RTW and training renewal loop.
- `portal/`: driver self-service status, documents, schedule and communications.
- `analytics/`: funnel, SLA and time-to-active metrics.
