import { Company } from "../lib/types";

export function CompanySwitcher({
  companies,
  selected,
  onChange,
}: {
  companies: Company[];
  selected: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="company-switcher" className="text-sm text-forest-900/60 font-medium">
        Company
      </label>
      <select
        id="company-switcher"
        className="border border-forest-700/20 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest-500/40"
        value={selected ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id} disabled={!c.isActive}>
            {c.name}
            {!c.isActive ? " (inactive)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
