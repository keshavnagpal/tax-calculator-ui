import { useMemo, useState } from 'react';
import * as TaxUtils from './taxUtils';
import './index.css';

const fmt = TaxUtils.formatNumber;
const rupee = (n: number) => `₹${fmt(n)}`;

interface Results {
    ctx: TaxUtils.SalaryContext;
    old: TaxUtils.TaxResult;
    new: TaxUtils.TaxResult;
}

export default function App() {
    const [income, setIncome] = useState<number | ''>('');
    const [claimHra, setClaimHra] = useState(true);
    const [isMetro, setIsMetro] = useState(true);
    const [includePf, setIncludePf] = useState(true);
    const [includeNps, setIncludeNps] = useState(false);
    const [includeMeal, setIncludeMeal] = useState(false);

    const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/,/g, '');
        if (/^\d*$/.test(value)) {
            setIncome(value === '' ? '' : Number(value));
        }
    };

    const results: Results | null = useMemo(() => {
        const gross = Number(income);
        if (!gross || gross <= 0) return null;
        const ctx = TaxUtils.createSalaryContext(gross, {
            claim_hra: claimHra,
            is_metro_city: isMetro,
            pf_included: includePf,
            include_nps: includeNps,
            include_meal_vouchers: includeMeal,
        });
        return { ctx, old: TaxUtils.calculateOldRegimeTax(ctx), new: TaxUtils.calculateNewRegimeTax(ctx) };
    }, [income, claimHra, isMetro, includePf, includeNps, includeMeal]);

    const diff = results ? results.old.total_tax - results.new.total_tax : 0;
    // Lower tax wins. Positive diff => new regime saves more.
    const best: 'old' | 'new' | 'tie' = Math.abs(diff) < 1 ? 'tie' : diff > 0 ? 'new' : 'old';

    return (
        <div className="page">
            <header className="masthead">
                <span className="kicker">FY {TaxUtils.TAX_YEAR.fy} · AY {TaxUtils.TAX_YEAR.ay}</span>
                <h1>Income &amp; Tax Calculator</h1>
                <p>See your in-hand salary and compare India's Old vs New tax regimes.</p>
            </header>

            <div className="layout">
                {/* ---------- Inputs ---------- */}
                <aside className="card panel">
                    <h2>Your details</h2>

                    <div className="field">
                        <label htmlFor="income">Gross annual salary (CTC)</label>
                        <div className="amount-input">
                            <span className="rupee">₹</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                id="income"
                                className="num"
                                value={income === '' ? '' : income.toLocaleString('en-IN')}
                                onChange={handleIncomeChange}
                                placeholder="15,00,000"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div className="checks">
                        <div className="check-group">
                            <Check
                                checked={claimHra}
                                onChange={setClaimHra}
                                title="Claim HRA exemption"
                                sub="Old regime only."
                            />
                            {claimHra && (
                                <div className="subfield">
                                    <div className="segmented" role="group" aria-label="City type">
                                        <button type="button" aria-pressed={isMetro} className={isMetro ? 'active' : ''} onClick={() => setIsMetro(true)}>
                                            Metro
                                        </button>
                                        <button type="button" aria-pressed={!isMetro} className={!isMetro ? 'active' : ''} onClick={() => setIsMetro(false)}>
                                            Non-metro
                                        </button>
                                    </div>
                                    <span className="cities">
                                        {isMetro
                                            ? `50% of basic: ${TaxUtils.METRO_CITIES.join(', ')}.`
                                            : '40% of basic: applies to all non-metro cities.'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Check checked={includePf} onChange={setIncludePf} title="Include Provident Fund" sub="12% of basic from you + 12% from employer." />
                        <Check
                            checked={includeNps}
                            onChange={setIncludeNps}
                            title={<>Invest ₹50k in NPS<span className="lock-tag">Locked till 60</span></>}
                            sub="Extra 80CCD(1B) deduction — old regime only."
                        />
                        <Check
                            checked={includeMeal}
                            onChange={setIncludeMeal}
                            title={<>Meal vouchers<span className="lock-tag">Food only</span></>}
                            sub="₹200/meal ≈ ₹1,05,600/yr tax-free (both regimes). Spendable only on food & groceries."
                        />
                    </div>
                </aside>

                {/* ---------- Results ---------- */}
                <section className="results">
                    {!results ? (
                        <div className="card empty">
                            <div className="mark">₹</div>
                            <p>Enter your gross annual salary to compare regimes and estimate your monthly in-hand pay.</p>
                        </div>
                    ) : (
                        <>
                            <div className={`recommend ${best === 'tie' ? 'tie' : ''}`}>
                                {best === 'tie' ? (
                                    <span className="lead">Both regimes cost you about the same.</span>
                                ) : (
                                    <span className="lead">
                                        The <b>{best === 'new' ? 'New' : 'Old'} Regime</b> works out better for you.
                                    </span>
                                )}
                                {best !== 'tie' && <span className="save num">Saves {rupee(Math.abs(diff))}/yr</span>}
                            </div>

                            <div className="regimes">
                                <RegimeCard label="Old Regime" r={results.old} isBest={best === 'old'} />
                                <RegimeCard label="New Regime" r={results.new} isBest={best === 'new'} />
                            </div>

                            <div className="card breakdown">
                                <h2 className="section-title">Detailed breakdown</h2>
                                <BreakdownTable results={results} best={best} />
                                <Disclosures gross={results.ctx.gross_annual} hra={claimHra} nps={includeNps} meal={includeMeal} />
                            </div>

                            {results.ctx.gross_annual > 10_000_000 && (
                                <p className="footnote">
                                    <span className="warn">High income:</span> surcharge applies — consider a tax
                                    professional for detailed planning (capital gains, perquisites, NPS 80CCD(2)).
                                </p>
                            )}
                            <p className="footnote">Estimates only, based on the assumptions above. Not tax advice.</p>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

/* ---------------- Sub-components ---------------- */

function Check({
    checked,
    onChange,
    title,
    sub,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    title: React.ReactNode;
    sub: string;
}) {
    return (
        <label className="check-row">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="check" aria-hidden="true" />
            <span className="check-text">
                <b>{title}</b>
                <small>{sub}</small>
            </span>
        </label>
    );
}

// Locked (non-liquid) components with their monthly amounts, in display order.
function lockedItems(r: TaxUtils.TaxResult): { key: string; monthly: number }[] {
    return [
        { key: 'PF', monthly: r.total_pf / 12 },
        { key: 'NPS', monthly: r.nps_deduction / 12 },
        { key: 'Meal vouchers', monthly: r.meal_voucher / 12 },
    ].filter((i) => i.monthly > 0);
}

function RegimeCard({ label, r, isBest }: { label: string; r: TaxUtils.TaxResult; isBest: boolean }) {
    const locked = lockedItems(r);
    return (
        <div className={`regime ${isBest ? 'best' : ''}`}>
            {isBest && <span className="badge">Recommended</span>}
            <h3>{label}</h3>

            <div className="hero">
                <span className="hero-k">Net take-home / year</span>
                <span className="hero-v num">{rupee(r.net_annual)}</span>
            </div>

            <div className="regime-foot">
                <div>
                    <span className="k">Monthly in-hand</span>
                    <span className="v num">{rupee(r.monthly_in_hand)}</span>
                </div>
                <div>
                    <span className="k">Annual tax</span>
                    <span className="v tax num">{rupee(r.total_tax)}</span>
                </div>
            </div>

            {locked.length > 0 && (
                <ul className="locked-list">
                    {locked.map((i) => (
                        <li key={i.key}>
                            <span>{i.key} · locked</span>
                            <span className="num">+{rupee(i.monthly)}/mo</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function BreakdownTable({ results, best }: { results: Results; best: 'old' | 'new' | 'tie' }) {
    const o = results.old;
    const n = results.new;
    const showPf = o.total_pf > 0;
    const showNps = o.nps_deduction > 0;
    const showMeal = o.meal_voucher > 0 || n.meal_voucher > 0;
    const anyLocked = showPf || showNps || showMeal;
    return (
        <div className="table-scroll">
            <table data-best={best}>
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>Old Regime</th>
                        <th>New Regime</th>
                    </tr>
                </thead>
                <tbody>
                    <GroupRow label="Take-home" />
                    <Row label="Net annual income" o={o.net_annual} n={n.net_annual} bold />
                    <Row label="Monthly in-hand" o={o.monthly_in_hand} n={n.monthly_in_hand} bold />
                    {showPf && <Row label="Monthly PF (you + employer) · locked" o={o.total_pf / 12} n={n.total_pf / 12} />}
                    {showNps && <Row label="Monthly NPS · locked" o={o.nps_deduction / 12} n={n.nps_deduction / 12} />}
                    {showMeal && <Row label="Monthly meal vouchers · locked" o={o.meal_voucher / 12} n={n.meal_voucher / 12} />}
                    {anyLocked && <Row label="Monthly total (in-hand + locked)" o={o.monthly_total} n={n.monthly_total} />}

                    <GroupRow label="Exemptions & deductions" />
                    <Row label="Standard deduction" o={o.standard_deduction} n={n.standard_deduction} />
                    <Row label="HRA exemption" o={o.hra_exemption} n={n.hra_exemption} />
                    <Row label="Section 80C" o={o.c80_deduction} n={n.c80_deduction} />
                    <Row label="Section 80D (health insurance)" o={o.d80_deduction} n={n.d80_deduction} />
                    <Row label="NPS 80CCD(1B)" o={o.nps_deduction} n={n.nps_deduction} />
                    <Row label="Meal vouchers (tax-free)" o={o.meal_voucher} n={n.meal_voucher} />
                    <Row label="Employer PF (exempt)" o={o.pf_employer} n={n.pf_employer} />
                    <Row label="Total deductions" o={o.total_deductions} n={n.total_deductions} bold />

                    <GroupRow label="Tax calculation" />
                    <Row label="Taxable income" o={o.taxable_income} n={n.taxable_income} bold />
                    <Row label="Income tax" o={o.income_tax} n={n.income_tax} />
                    <Row label="Surcharge" o={o.surcharge} n={n.surcharge} />
                    <Row label="Health & education cess" o={o.cess} n={n.cess} />
                    <Row label="Total annual tax" o={o.total_tax} n={n.total_tax} total />
                </tbody>
            </table>
        </div>
    );
}

function GroupRow({ label }: { label: string }) {
    return (
        <tr className="group-row">
            <td colSpan={3}>{label}</td>
        </tr>
    );
}

function Row({ label, o, n, bold = false, total = false }: { label: string; o: number; n: number; bold?: boolean; total?: boolean }) {
    const cls = [bold && 'bold-row', total && 'total-row'].filter(Boolean).join(' ');
    const money = total ? 'num tax-figure' : 'num';
    const cell = (v: number) => (!total && v === 0 ? '—' : rupee(v));
    return (
        <tr className={cls}>
            <td>{label}</td>
            <td className={money}>{cell(o)}</td>
            <td className={money}>{cell(n)}</td>
        </tr>
    );
}

function Disclosures({ gross, hra, nps, meal }: { gross: number; hra: boolean; nps: boolean; meal: boolean }) {
    return (
        <>
            <details className="note">
                <summary>Assumptions used</summary>
                <ul>
                    <li><strong>Basic pay = 50%</strong> of your CTC{hra ? '; HRA = 50% (metro) / 40% (non-metro) of basic' : ''}.</li>
                    {hra && (
                        <li>
                            <strong>HRA is treated as fully exempt</strong> — this assumes your rent is high enough. Actual
                            exemption is the least of (HRA received, rent − 10% of basic, 50/40% of basic).
                        </li>
                    )}
                    <li>
                        <strong>80C fully used (₹1,50,000)</strong> and <strong>80D health insurance (₹50,000)</strong> —
                        old regime. For most salaried people, EPF alone covers 80C, so no extra cash is set aside for it.
                    </li>
                    {nps && <li><strong>NPS ₹50,000</strong> under 80CCD(1B), old regime — treated as cash you lock away, so it lowers in-hand.</li>}
                    {meal && <li><strong>Meal vouchers ₹1,05,600/yr</strong> (₹200 × 2 meals × 22 days × 12), tax-free in both regimes — food/grocery-only, so counted as locked, not liquid.</li>}
                    <li>Employer PF is treated as exempt (within the ₹7.5L combined cap).</li>
                    <li>New regime standard deduction ₹75,000; 87A rebate up to ₹12L taxable (with marginal relief).</li>
                </ul>
            </details>
            <details className="note">
                <summary>Limitations to keep in mind</summary>
                <ul>
                    <li>This is an <strong>optimistic, tax-optimised</strong> model — it assumes every eligible deduction is used.</li>
                    <li><strong>Locked ≠ liquid.</strong> PF, NPS and meal vouchers are yours but can't be spent as free cash (NPS locks till 60; vouchers are food-only), so they're shown apart from in-hand.</li>
                    <li>
                        Not modelled: <strong>employer NPS 80CCD(2)</strong> (available even in the new regime), home-loan
                        interest, HRA rent limits, marginal surcharge relief, capital gains, and other income.
                    </li>
                    {gross > 5_000_000 && <li>Surcharge is applied but <strong>marginal relief on surcharge</strong> is not.</li>}
                </ul>
            </details>
        </>
    );
}
