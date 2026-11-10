/**
 * Union Parishads by area, used by the checkout address form.
 *
 * Key format:  "<district>|<upazila or thana>"  →  list of union names.
 * Example:     "ঢাকা|সাভার": ["আশুলিয়া", "ভাকুর্তা", ...]
 *
 * Where an entry exists the checkout shows a dropdown; where it does not, the
 * customer types the union name instead. Fill this from the official local
 * government dataset (about 4,500 unions) — the form needs no other change.
 */
export const BD_UNIONS: Record<string, string[]> = {};
