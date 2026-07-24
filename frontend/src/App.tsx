import { useEffect, useMemo, useState } from "react";
import { Company, Deduction, RecoverySummary } from "./lib/types";
import { api } from "./lib/api";
import { CompanySwitcher } from "./components/CompanySwitcher";
import { RecoveryDashboard } from "./components/RecoveryDashboard";
import { DeductionsTable } from "./components/DeductionsTable";
import { DisputeDrawer } from "./components/DisputeDrawer";
import { STAGE_LABELS } from "./lib/format";

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Deduction | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  useEffect(() => {
    api.companies().then((cs) => {
      setCompanies(cs);
      const firstActive = cs.find((c) => c.isActive);
      if (firstActive) setCompanyId(firstActive.id);
    });
  }, []);

  useEffect(() => {
    if (companyId === null) return;
    setLoading(true);
    Promise.all([api.deductions(companyId), api.recoverySummary(companyId)])
      .then(([d, s]) => {
        setDeductions(d);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  function refresh() {
    if (companyId === null) return;
    Promise.all([api.deductions(companyId), api.recoverySummary(companyId)]).then(([d, s]) => {
      setDeductions(d);
      setSummary(s);
    });
  }

  const filtered = useMemo(() => {
    return deductions.filter((d) => {
      if (onlyFlagged && d.flags.length === 0) return false;
      const stage = d.dispute?.stage ?? "NOT_DISPUTED";
      if (stageFilter !== "ALL" && stage !== stageFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${d.retailerName ?? ""} ${d.retailerNameRaw ?? ""} ${d.invoiceNumber ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [deductions, onlyFlagged, stageFilter, search]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-forest-900/10 bg-white/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-forest-900">Deduction recovery</h1>
            <p className="text-xs text-forest-900/45">Chase down what retailers owe you</p>
          </div>
          <CompanySwitcher companies={companies} selected={companyId} onChange={setCompanyId} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading && <p className="text-forest-900/50">Loading…</p>}

        {!loading && summary && <RecoveryDashboard summary={summary} />}

        {!loading && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search retailer or invoice #"
                className="border border-forest-900/20 rounded-md px-3 py-1.5 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/40"
              />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="border border-forest-900/20 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-500/40"
              >
                <option value="ALL">All stages</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-forest-900/70">
                <input
                  type="checkbox"
                  checked={onlyFlagged}
                  onChange={(e) => setOnlyFlagged(e.target.checked)}
                />
                Only flagged
              </label>
              <span className="text-sm text-forest-900/40 ml-auto">
                {filtered.length} of {deductions.length}
              </span>
            </div>

            <DeductionsTable deductions={filtered} onSelect={setSelected} />
          </>
        )}
      </main>

      {selected && (
        <DisputeDrawer
          deduction={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setSelected(updated);
            setDeductions((prev) => prev.map((d) => (d.sourceId === updated.sourceId ? updated : d)));
            refresh();
          }}
        />
      )}
    </div>
  );
}
