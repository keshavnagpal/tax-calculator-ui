import { useState, type ChangeEvent } from 'react';
import './TaxCalculator.css';

// ... (Keep all the existing constants and interfaces: HEALTH_AND_EDUCATION_CESS_RATE, etc.)
// Financial Year 2025-26 (Assessment Year 2026-27) Tax Constants
const HEALTH_AND_EDUCATION_CESS_RATE = 0.04;
const STANDARD_DEDUCTION = 50_000.0;

// Old Tax Regime
const OLD_REGIME_REBATE_LIMIT = 500_000.0;
const SECTION_80C_LIMIT = 150_000.0;
const SECTION_80D_LIMIT = 50_000.0;

// New Tax Regime (Default)
const NEW_REGIME_REBATE_LIMIT = 1_200_000.0;
const NEW_REGIME_STANDARD_DEDUCTION = 75_000.0;

interface SalaryContext {
    gross_annual: number;
    is_metro_city: boolean;
    pf_included: boolean;
    basic: number;
    hra: number;
    pf_employee: number;
    pf_employer: number;
    total_pf: number;
}

interface TaxResult {
    regime_name: string;
    taxable_income: number;
    income_tax: number;
    surcharge: number;
    cess: number;
    total_tax: number;
    monthly_in_hand: number;
    monthly_pf: number;
    monthly_total: number;
    hra_exemption: number;
    c80_deduction: number;
    standard_deduction: number;
    total_deductions: number;
    pf_employer: number
}

function createSalaryContext(gross_annual: number, is_metro_city: boolean, pf_included: boolean): SalaryContext {
    const basic = gross_annual * 0.5;
    const hra_rate = is_metro_city ? 0.5 : 0.4;
    const hra = basic * hra_rate;
    let pf_employee = 0;
    let pf_employer = 0;
    if (pf_included) {
        pf_employee = basic * 0.12;
        pf_employer = basic * 0.12;
    }
    const total_pf = pf_employee + pf_employer;

    return { gross_annual, is_metro_city, pf_included, basic, hra, pf_employee, pf_employer, total_pf };
}

function _calculate_surcharge(taxable_income: number, tax_payable: number, regime_name: string): number {
    if (taxable_income <= 5_000_000) {
        return 0.0;
    }

    let rate: number;
    if (taxable_income <= 10_000_000) {
        rate = 0.10;
    } else if (taxable_income <= 20_000_000) {
        rate = 0.15;
    } else if (taxable_income <= 50_000_000) {
        rate = 0.25;
    } else { // Over 5 Crores
        if (regime_name === "New Regime") {
            rate = 0.25; // Surcharge capped at 25% for New Regime
        } else {
            rate = 0.37;
        }
    }
    
    return tax_payable * rate;
}

function calculate_old_regime_tax(ctx: SalaryContext): TaxResult {
    const hra_exemption = ctx.hra;
    const standard_deduction = STANDARD_DEDUCTION;
    const total_deductions = hra_exemption + SECTION_80C_LIMIT + standard_deduction + SECTION_80D_LIMIT + ctx.pf_employer;
    let taxable_income = ctx.gross_annual - total_deductions;
    taxable_income = Math.max(0.0, taxable_income);

    let tax = 0.0;
    if (taxable_income > OLD_REGIME_REBATE_LIMIT) {
        if (taxable_income <= 250_000) {
            tax = 0.0;
        } else if (taxable_income <= 500_000) {
            tax = (taxable_income - 250_000) * 0.05;
        } else if (taxable_income <= 1_000_000) {
            tax = 12_500 + (taxable_income - 500_000) * 0.20;
        } else {
            tax = 112_500 + (taxable_income - 1_000_000) * 0.30;
        }
    }
    
    const surcharge = _calculate_surcharge(taxable_income, tax, "Old Regime");
    const cess = (tax + surcharge) * HEALTH_AND_EDUCATION_CESS_RATE;
    const total_tax = tax + surcharge + cess;

    const cash_salary = ctx.gross_annual - ctx.total_pf - total_tax;
    const monthly_in_hand = cash_salary / 12;
    const monthly_pf = ctx.total_pf / 12;

    return {
        regime_name: "Old Regime",
        taxable_income,
        income_tax: tax,
        surcharge,
        cess,
        total_tax,
        monthly_in_hand,
        monthly_pf,
        monthly_total: monthly_in_hand + monthly_pf,
        hra_exemption,
        c80_deduction: SECTION_80C_LIMIT,
        standard_deduction,
        total_deductions,
        pf_employer: ctx.pf_employer
    };
}

function calculate_new_regime_tax(ctx: SalaryContext): TaxResult {
    const standard_deduction = NEW_REGIME_STANDARD_DEDUCTION;
    const total_deductions = standard_deduction + ctx.pf_employer;
    let taxable_income = ctx.gross_annual - total_deductions;
    taxable_income = Math.max(0.0, taxable_income);

    let tax = 0.0;
    if (taxable_income > NEW_REGIME_REBATE_LIMIT) {
        if (taxable_income <= 400_000) {
            tax = 0.0;
        } else if (taxable_income <= 800_000) {
            tax = (taxable_income - 400_000) * 0.05;
        } else if (taxable_income <= 1_200_000) {
            tax = 20_000 + (taxable_income - 800_000) * 0.10;
        } else if (taxable_income <= 1_600_000) {
            tax = 60_000 + (taxable_income - 1_200_000) * 0.15;
        } else if (taxable_income <= 2_000_000) {
            tax = 120_000 + (taxable_income - 1_600_000) * 0.20;
        } else if (taxable_income <= 2_400_000) {
            tax = 200_000 + (taxable_income - 2_000_000) * 0.25;
        } else {
            tax = 300_000 + (taxable_income - 2_400_000) * 0.30;
        }
    }

    const surcharge = _calculate_surcharge(taxable_income, tax, "New Regime");
    const cess = (tax + surcharge) * HEALTH_AND_EDUCATION_CESS_RATE;
    const total_tax = tax + surcharge + cess;

    const cash_salary = ctx.gross_annual - ctx.total_pf - total_tax;
    const monthly_in_hand = cash_salary / 12;
    const monthly_pf = ctx.total_pf / 12;

    return {
        regime_name: "New Regime",
        taxable_income,
        income_tax: tax,
        surcharge,
        cess,
        total_tax,
        monthly_in_hand,
        monthly_pf,
        monthly_total: monthly_in_hand + monthly_pf,
        hra_exemption: 0,
        c80_deduction: 0,
        standard_deduction,
        total_deductions,
        pf_employer: ctx.pf_employer
    };
}


interface Results {
    ctx: SalaryContext;
    old: TaxResult;
    new: TaxResult;
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);

export function TaxCalculator() {
    const [income, setIncome] = useState<number | ''>('');
    const [isMetro, setIsMetro] = useState(true);
    const [includePf, setIncludePf] = useState(true);
    const [results, setResults] = useState<Results | null>(null);
    const [showResults, setShowResults] = useState(false);

    const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/,/g, '');
        if (/^\d*$/.test(value)) {
            setIncome(value === '' ? '' : Number(value));
        }
    };

    const handleSubmit = (event: ChangeEvent) => {
        event.preventDefault();
        const gross_annual = Number(income);
        if (gross_annual > 0) {
            const ctx = createSalaryContext(gross_annual, isMetro, includePf);
            const oldResult = calculate_old_regime_tax(ctx);
            const newResult = calculate_new_regime_tax(ctx);
            setResults({ ctx, old: oldResult, new: newResult });
            setShowResults(true);
        } else {
            setResults(null);
            setShowResults(false);
        }
    };

    const handleReset = () => {
        setShowResults(false);
        setResults(null);
        setIncome('');
    }

    const preferredRegime = results && results.old.total_tax < results.new.total_tax ? 'Old' : 'New';

    return (
        <div className={`calculator-container ${showResults ? 'results-shown' : ''}`}>
            <header>
                <h1>Income Calculator</h1>
            </header>

            <form onSubmit={handleSubmit}>
                <label htmlFor="income">Gross Annual Salary (CTC)</label>
                <input
                    type="text"
                    inputMode="numeric"
                    id="income"
                    value={income === '' ? '' : income.toLocaleString('en-IN')}
                    onChange={handleIncomeChange}
                    placeholder="e.g., 15,00,000"
                    required
                />
                <fieldset>
                    <label htmlFor="isMetro">
                        <input
                            type="checkbox"
                            id="isMetro"
                            role="switch"
                            checked={isMetro}
                            onChange={e => setIsMetro(e.target.checked)}
                        />
                        Live in a Metro City
                    </label>
                    <label htmlFor="includePf">
                        <input
                            type="checkbox"
                            id="includePf"
                            role="switch"
                            checked={includePf}
                            onChange={e => setIncludePf(e.target.checked)}
                        />
                        Include Provident Fund
                    </label>
                </fieldset>
                <button type="submit">Calculate</button>
            </form>

            {results && (
                <article className="results-card">
                    <div className="results-header">
                        <div>
                            <span>Gross Annual</span>
                            <strong>₹{formatNumber(results.ctx.gross_annual)}</strong>
                        </div>
                        <div className={preferredRegime === 'Old' ? 'highlight' : ''}>
                            <span>Net Income (Old)</span>
                            <strong>₹{formatNumber(results.ctx.gross_annual - results.old.total_tax)}</strong>
                        </div>
                        <div className={preferredRegime === 'New' ? 'highlight' : ''}>
                            <span>Net Income (New)</span>
                            <strong>₹{formatNumber(results.ctx.gross_annual - results.new.total_tax)}</strong>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Old Regime</th>
                                    <th>New Regime</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="group-header">
                                    <td colSpan={3}>Final Take-Home</td>
                                </tr>
                                <ResultRow label="Net Annual Income" oldResult={results.ctx.gross_annual - results.old.total_tax} newResult={results.ctx.gross_annual - results.new.total_tax} isBold />
                                <ResultRow label="Monthly In-Hand" oldResult={results.old.monthly_in_hand} newResult={results.new.monthly_in_hand} isBold />
                                <ResultRow label="Monthly PF" oldResult={results.old.monthly_pf} newResult={results.new.monthly_pf} />
                                <ResultRow label="Monthly Total" oldResult={results.old.monthly_total} newResult={results.new.monthly_total} isBold />
                                <tr className="spacer"><td colSpan={3}></td></tr>
                                <tr className="group-header">
                                    <td colSpan={3}>Exemptions & Deductions</td>
                                </tr>
                                <ResultRow label="HRA Exemption" oldResult={results.old.hra_exemption} newResult={results.new.hra_exemption} />
                                <ResultRow label="Section 80C" oldResult={results.old.c80_deduction} newResult={results.new.c80_deduction} />
                                <ResultRow label="Section 80D" oldResult={SECTION_80D_LIMIT} newResult={0} />
                                <ResultRow label="Standard Deduction" oldResult={results.old.standard_deduction} newResult={results.new.standard_deduction} />
                                <ResultRow label="Employer PF" oldResult={results.old.pf_employer} newResult={results.new.pf_employer} />
                                <ResultRow label="Total Deductions" oldResult={results.old.total_deductions} newResult={results.new.total_deductions} isBold />

                                <tr className="spacer"><td colSpan={3}></td></tr>
                                <ResultRow label="Taxable Income" oldResult={results.old.taxable_income} newResult={results.new.taxable_income} isBold />
                                <tr className="spacer"><td colSpan={3}></td></tr>

                                <tr className="group-header">
                                    <td colSpan={3}>Tax Calculation</td>
                                </tr>
                                <ResultRow label="Income Tax" oldResult={results.old.income_tax} newResult={results.new.income_tax} />
                                <ResultRow label="Surcharge" oldResult={results.old.surcharge} newResult={results.new.surcharge} />
                                <ResultRow label="Health & Edu Cess" oldResult={results.old.cess} newResult={results.new.cess} />
                                <ResultRow label="Total Annual Tax" oldResult={results.old.total_tax} newResult={results.new.total_tax} isBold />
                            </tbody>
                        </table>
                    </div>
                     {results.ctx.gross_annual > 10_000_000 && (
                        <p className="high-income-note"><strong>Note:</strong> Your income is high. It is advisable to consult a CA for detailed tax planning.</p>
                    )}
                    <button className="secondary" onClick={handleReset}>Reset</button>
                </article>
            )}
        </div>
    );
}

const ResultRow = ({ label, oldResult, newResult, isBold = false, highlight = false }: { label: string, oldResult: number, newResult: number, isBold?: boolean, highlight?: boolean }) => (
    <tr className={`${isBold ? 'bold-row' : ''} ${highlight ? 'highlight-row' : ''}`}>
        <td>{label}</td>
        <td>{formatNumber(oldResult)}</td>
        <td>{formatNumber(newResult)}</td>
    </tr>
);
