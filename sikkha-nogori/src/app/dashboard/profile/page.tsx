import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { updateCustomerProfile, updateCustomerPassword } from "./actions";
import { ProfileDetailsForm } from "./profile-details-form";
import { ProfileAvatarUploader } from "./profile-avatar-uploader";
import { requireCustomer } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "My Profile | Sikkha Nogori",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  invalid: "Please check your name, gender, and date of birth and try again.",
  saved: "✓ Saved successfully!",
  password: "✓ Password updated successfully!",
  passwordInvalid: "Password must contain at least 8 characters.",
  passwordMismatch: "The passwords do not match. Please try again.",
};

async function ProfileContent({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  await connection();
  const { supabase, user } = await requireCustomer();
  const params = await searchParams;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const { data: profile, error } = await supabase.from("profiles").select("display_name, date_of_birth, gender, avatar_url").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Unable to load your profile.", { cause: error });
  const name = profile?.display_name?.trim() || "Your Name";
  const email = user.email || user.phone || "Not provided";
  const completion = Math.round(([Boolean(profile?.display_name?.trim()), Boolean(user.email), Boolean(profile?.date_of_birth), Boolean(profile?.gender)].filter(Boolean).length / 4) * 100);
  const message = status ? messages[status] : undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 text-slate-800 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-blue-700">SIKKHA NOGORI / ACCOUNT</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">My Profile</h1><p className="mt-1 text-sm text-slate-500">Manage your personal information and account security.</p></div>
          <Link href="/dashboard" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100">← Dashboard</Link>
        </div>
        {message && <p role="status" className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${status?.startsWith("password") && status !== "password" || status === "invalid" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"}`}>{message}</p>}
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <ProfileAvatarUploader userId={user.id} avatarUrl={profile?.avatar_url ?? null} />
            <h2 className="mt-4 text-center text-xl font-extrabold">{name}</h2><p className="mt-1 break-all text-center text-sm text-slate-500">{email}</p>
            <div className="mt-6 rounded-xl bg-green-50 p-4"><div className="flex items-center justify-between text-sm font-bold text-green-800"><span>Profile Completion</span><span>{completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-green-100"><div className="h-full rounded-full bg-green-600" style={{ width: completion + "%" }} /></div><p className="mt-2 text-xs text-green-800">{completion === 100 ? "Your available profile details are complete." : "Add your name, date of birth, gender, and email to complete your profile."}</p></div>
            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm"><p className="font-semibold text-slate-700">✓ Active account</p><p className="text-slate-500">Signed in securely</p></div>
          </aside>
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="font-bold">Personal Information</h2><p className="mt-1 text-xs text-slate-500">Update the name shown on your account.</p></div><span className="text-xl">♙</span></div>
              <ProfileDetailsForm
                action={updateCustomerProfile}
                defaultName={profile?.display_name ?? ""}
                defaultDateOfBirth={profile?.date_of_birth ?? ""}
                defaultGender={profile?.gender ?? ""}
                email={email}
                isSaved={status === "saved"}
                maxDate={new Date().toISOString().slice(0, 10)}
              />
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="font-bold">Contact Information</h2><p className="mt-1 text-xs text-slate-500">Your registered account contact.</p></div><span className="text-xl">✉</span></div>
              <div className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-slate-500">Email / Phone</span><strong className="break-all text-sm">{email}</strong></div><div className="flex items-center justify-between gap-2"><span className="text-sm text-slate-500">Account status</span><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">✓ Active</span></div></div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4"><div><h2 className="font-bold">Password</h2><p className="mt-1 text-xs text-slate-500">Keep your account secure with a strong password.</p></div><span className="text-xl">🔒</span></div>
              <form action={updateCustomerPassword} className="space-y-4 p-5">
                <div><label htmlFor="new-password" className="mb-2 block text-sm font-semibold">New Password</label><input id="new-password" name="newPassword" type="password" minLength={8} autoComplete="new-password" required className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="At least 8 characters" /></div>
                <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">Confirm New Password</label><input id="confirm-password" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Enter the password again" /></div>
                <div className="flex justify-end"><button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100">Update Password</button></div>
              </form>
            </section>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Sikkha Nogori · Your learning account</p>
      </div>
    </main>
  );
}

export default function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-5xl animate-pulse rounded-2xl bg-white p-10"><div className="h-8 w-56 rounded bg-slate-200" /><div className="mt-8 h-64 rounded-xl bg-slate-100" /></div></main>}><ProfileContent searchParams={searchParams} /></Suspense>;
}
