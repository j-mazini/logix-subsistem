import { useState } from "react";
import type { TraceQueryCaseOutcome } from "../../TraceQueries/types";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface CaseUpdateFormProps {
  submitting: boolean;
  onSubmit: (input: { note: string; photos: string[]; outcome: TraceQueryCaseOutcome }) => void;
}

/**
 * The driver's single action on an assigned case: notes + photo evidence +
 * a mandatory Resolved/Not Resolved pick. Submitting either button closes
 * the case — there's no "save a note" step in between.
 */
export function CaseUpdateForm({ submitting, onSubmit }: CaseUpdateFormProps) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const noteValid = note.trim().length > 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const dataUrls = await Promise.all(Array.from(files).map(readAsDataUrl));
      setPhotos((prev) => [...prev, ...dataUrls]);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (outcome: TraceQueryCaseOutcome) => {
    if (!noteValid) {
      setAttempted(true);
      return;
    }
    onSubmit({ note: note.trim(), photos, outcome });
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-500">
        <i className="bi bi-pencil-square" aria-hidden="true" /> Submit resolution
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Resolution notes <span className="text-red-600">*</span>
        </label>
        <textarea
          rows={4}
          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 ${attempted && !noteValid ? "border-red-400" : "border-slate-300"}`}
          placeholder="What did you find / do to resolve this?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {attempted && !noteValid && <p className="mt-1 text-xs text-red-600">Notes are required.</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Photo evidence</label>
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-transparent px-3 py-3.5 text-sm font-medium text-indigo-600 cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50">
          <i className="bi bi-camera-fill" aria-hidden="true" />
          {uploading ? "Uploading…" : "Add photos"}
          <input
            type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
          />
        </label>

        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative">
                <img src={photo} alt={`Evidence ${i + 1}`} className="h-16 w-16 rounded-md object-cover border border-slate-200" />
                <button
                  type="button" onClick={() => removePhoto(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-[10px]"
                  aria-label="Remove photo"
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button" disabled={submitting}
          onClick={() => handleSubmit("not_resolved")}
          className="flex-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2.5 text-sm font-semibold transition-transform hover:bg-rose-100 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
        >
          <i className="bi bi-x-circle mr-1" aria-hidden="true" /> Not Resolved
        </button>
        <button
          type="button" disabled={submitting}
          onClick={() => handleSubmit("resolved")}
          className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-3 py-2.5 text-sm font-semibold shadow-md shadow-emerald-600/20 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
        >
          <i className="bi bi-check-circle mr-1" aria-hidden="true" /> Resolved
        </button>
      </div>
    </div>
  );
}
