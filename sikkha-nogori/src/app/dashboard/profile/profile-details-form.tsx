"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function SaveButton({ isSaved, dirty }: { isSaved: boolean; dirty: boolean }) {
  const { pending } = useFormStatus();
  const saved = isSaved && !dirty;

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className={`inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-wait disabled:opacity-80 ${
        pending
          ? "bg-blue-500 focus:ring-blue-100"
          : saved
            ? "bg-green-600 hover:bg-green-700 focus:ring-green-100"
            : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-100"
      }`}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Saving...
        </>
      ) : saved ? (
        <>✓ Saved</>
      ) : (
        "Save Changes"
      )}
    </button>
  );
}

export function ProfileDetailsForm({
  action,
  defaultName,
  defaultDateOfBirth,
  defaultGender,
  email,
  isSaved,
  maxDate,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultName: string;
  defaultDateOfBirth: string;
  defaultGender: string;
  email: string;
  isSaved: boolean;
  maxDate: string;
}) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isSaved) setDirty(false);
  }, [isSaved]);

  return (
    <form action={action} onChange={() => setDirty(true)} className="space-y-4 p-5">
      <div>
        <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">Full Name</label>
        <input id="profile-name" name="displayName" maxLength={100} required defaultValue={defaultName} placeholder="Enter your full name" className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      </div>
      <div>
        <label htmlFor="date-of-birth" className="mb-2 block text-sm font-semibold">Date of Birth</label>
        <input id="date-of-birth" name="dateOfBirth" type="date" max={maxDate} defaultValue={defaultDateOfBirth} className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <p className="mt-1 text-xs text-slate-500">Optional · Your date of birth is visible only in your account profile.</p>
      </div>
      <div>
        <label htmlFor="profile-gender" className="mb-2 block text-sm font-semibold">Gender</label>
        <select id="profile-gender" name="gender" defaultValue={defaultGender} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option value="">Select gender (optional)</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Email Address</label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">{email}</div>
        <p className="mt-1 text-xs text-slate-500">Your sign-in email is managed by your authentication account.</p>
      </div>
      <div className="flex justify-end">
        <SaveButton isSaved={isSaved} dirty={dirty} />
      </div>
    </form>
  );
}
