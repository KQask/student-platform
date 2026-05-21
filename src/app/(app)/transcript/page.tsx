import { TranscriptUploader } from "./TranscriptUploader";

export default function TranscriptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Import transcript</h1>
        <p className="text-sm text-gray-600">
          Upload a PDF transcript (or paste it as text) — we'll extract your courses,
          terms, units, and grades, and add them to your active plan. You can review
          everything before anything is saved.
        </p>
      </div>
      <TranscriptUploader />
    </div>
  );
}
