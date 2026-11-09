import Link from "next/link";
import { telHref, whatsappHref, type GeneralSettings } from "@/lib/site-settings";

const footerLinks = [
  { href: "/about", label: "আমাদের সম্পর্কে" },
  { href: "/contact", label: "যোগাযোগ" },
  { href: "/blog", label: "ব্লগ" },
  { href: "/books", label: "বইয়ের সংগ্রহ" },
  { href: "/courses", label: "অনলাইন কোর্স" },
  { href: "/affiliate-disclosure", label: "অ্যাফিলিয়েট প্রকাশনা" },
  { href: "/privacy", label: "গোপনীয়তা নীতি" },
  { href: "/terms", label: "ব্যবহারের শর্তাবলি" },
];

const socialLabels: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn", x: "X" };
const DEFAULT_ABOUT = "বই ও শেখার উপকরণ খুঁজে দেখুন—তথ্য ও প্রাপ্যতা সংশ্লিষ্ট প্রকাশক বা বিক্রেতার কাছে যাচাই করুন।";

export function SiteFooter({ settings, year }: { settings?: GeneralSettings; year?: number }) {
  const name = settings?.siteName || "শিক্ষা নগরী";
  const social = Object.entries(settings?.social ?? {}).filter(([, url]) => url);
  const wa = settings?.whatsapp ? whatsappHref(settings.whatsapp) : "";
  const hasContact = Boolean(settings && (settings.contactPhone || settings.contactEmail || wa || settings.address || settings.businessHours));
  const linkClass = "rounded-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <footer className="mt-auto bg-[#073f33] text-emerald-50">
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-[1.3fr_1fr_1.1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg text-xl font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" className="size-10 rounded-xl bg-white/10 object-contain" />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-base">{name.slice(0, 1)}</span>
            )}
            {name}
          </Link>
          <p className="mt-3 max-w-md text-sm leading-7 text-emerald-100/85">{settings?.footerAbout || settings?.tagline || DEFAULT_ABOUT}</p>
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="সোশ্যাল মিডিয়া">
              {social.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-white/25 px-3.5 text-xs font-semibold text-white transition hover:bg-white/10">
                    {socialLabels[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="ফুটার নেভিগেশন">
          <h2 className="font-bold text-white">সহায়তা ও তথ্য</h2>
          <ul className="mt-3 grid gap-2.5 text-sm text-emerald-100/85 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {footerLinks.map((item) => (
              <li key={item.href}><Link className={linkClass} href={item.href}>{item.label}</Link></li>
            ))}
          </ul>
        </nav>

        {hasContact && settings && (
          <div className="text-sm text-emerald-100/85 sm:col-span-2 lg:col-span-1">
            <h2 className="font-bold text-white">যোগাযোগ</h2>
            <ul className="mt-3 space-y-2.5 leading-6">
              {settings.contactPhone && <li>ফোন: <a className={linkClass} href={telHref(settings.contactPhone)}>{settings.contactPhone}</a></li>}
              {wa && <li>হোয়াটসঅ্যাপ: <a className={linkClass} href={wa} target="_blank" rel="noopener noreferrer">{settings.whatsapp}</a></li>}
              {settings.contactEmail && <li>ইমেইল: <a className={`${linkClass} break-all`} href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></li>}
              {settings.businessHours && <li>সময়: {settings.businessHours}</li>}
              {settings.address && <li className="whitespace-pre-line">{settings.address}</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs leading-6 text-emerald-100/75">
        {settings?.returnPolicy && <p className="mx-auto mb-1 max-w-3xl">{settings.returnPolicy}</p>}
        <p>বিক্রেতার পৃষ্ঠায় মূল্য, মজুত ও পণ্যের বিবরণ যাচাই করুন।</p>
        <p className="mt-1">© {year ? `${year} ` : ""}{name}</p>
      </div>
    </footer>
  );
}
