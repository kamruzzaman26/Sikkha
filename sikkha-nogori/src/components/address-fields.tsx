"use client";

import { useEffect, useState } from "react";
import { areasOf, districtsOf, DIVISIONS } from "@/lib/bd-geo";
import { BD_UNIONS } from "@/lib/bd-unions";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "mb-2 block text-sm font-semibold";
const OTHER = "__other__";

/** A dropdown whose submitted value may be typed when the list has no match. */
function ChoiceWithOther({
  id, name, label, options, required, disabled, placeholder, onValue,
}: {
  id: string; name: string; label: string; options: string[]; required?: boolean;
  disabled?: boolean; placeholder: string; onValue?: (value: string) => void;
}) {
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState("");
  const value = choice === OTHER ? typed : choice;
  useEffect(() => { onValue?.(value); }, [value, onValue]);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}{required ? " *" : ""}</label>
      <select
        id={id}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        required={required}
        disabled={disabled}
        className={field}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value={OTHER}>অন্য (নিজে লিখব)</option>
      </select>
      {choice === OTHER && (
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          required={required}
          maxLength={80}
          placeholder="নাম লিখুন"
          aria-label={`${label} লিখুন`}
          className={`${field} mt-2`}
        />
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function AddressFields() {
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const districts = division ? districtsOf(division) : [];
  const areas = division && district ? areasOf(division, district) : [];

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="delivery-division" className={labelClass}>বিভাগ *</label>
        <select
          id="delivery-division"
          name="division"
          required
          value={division}
          onChange={(e) => { setDivision(e.target.value); setDistrict(""); setArea(""); }}
          className={field}
        >
          <option value="" disabled>বিভাগ নির্বাচন করুন</option>
          {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="delivery-district" className={labelClass}>জেলা *</label>
        <select
          id="delivery-district"
          name="district"
          required
          disabled={!division}
          value={district}
          onChange={(e) => { setDistrict(e.target.value); setArea(""); }}
          className={field}
        >
          <option value="" disabled>{division ? "জেলা নির্বাচন করুন" : "আগে বিভাগ নির্বাচন করুন"}</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <ChoiceWithOther
        key={`area-${division}-${district}`}
        onValue={setArea}
        id="delivery-thana"
        name="thana"
        label="উপজেলা / থানা"
        required
        disabled={!district}
        placeholder={district ? "উপজেলা বা থানা নির্বাচন করুন" : "আগে জেলা নির্বাচন করুন"}
        options={areas}
      />

      <UnionField district={district} areaKey={area} />

      <div className="sm:col-span-2">
        <label htmlFor="delivery-area" className={labelClass}>গ্রাম / এলাকা / মহল্লা *</label>
        <input id="delivery-area" name="area" required maxLength={120} placeholder="গ্রাম, এলাকা, রোড বা মহল্লার নাম" className={field} />
      </div>
    </div>
  );
}

function UnionField({ district, areaKey }: { district: string; areaKey: string }) {
  const list = BD_UNIONS[`${district}|${areaKey}`];
  if (list && list.length > 0) {
    return (
      <ChoiceWithOther
        key={`union-${district}-${areaKey}`}
        id="delivery-union"
        name="union"
        label="ইউনিয়ন পরিষদ"
        placeholder="ইউনিয়ন নির্বাচন করুন"
        options={list}
      />
    );
  }
  return (
    <div>
      <label htmlFor="delivery-union" className={labelClass}>ইউনিয়ন পরিষদ (শহর হলে ফাঁকা রাখুন)</label>
      <input id="delivery-union" name="union" maxLength={80} placeholder="ইউনিয়নের নাম" className={field} />
    </div>
  );
}
