import { useState, type ChangeEvent } from 'react';
import * as TaxUtils from './taxUtils';
import './index.css';

export default function App() {
    const [income, setIncome] = useState<number | ''>('');
    const [isMetro, setIsMetro] = useState(true);
    const [includePf, setIncludePf] = useState(true);
    const [results, setResults] = useState<{ ctx: TaxUtils.SalaryContext; old: TaxUtils.TaxResult; new: TaxUtils.TaxResult } | null>(null);
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
            const ctx = TaxUtils.createSalaryContext(gross_annual, isMetro, includePf);
            const oldResult = TaxUtils.calculateOldRegimeTax(ctx);
            const newResult = TaxUtils.calculateNewRegimeTax(ctx);
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
        <main className="container">
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
                                <strong>₹{TaxUtils.formatNumber(results.ctx.gross_annual)}</strong>
                            </div>
                            <div className={preferredRegime === 'Old' ? 'highlight' : ''}>
                                <span>Net Income (Old)</span>
                                <strong>₹{TaxUtils.formatNumber(results.ctx.gross_annual - results.old.total_tax)}</strong>
                            </div>
                            <div className={preferredRegime === 'New' ? 'highlight' : ''}>
                                <span>Net Income (New)</span>
                                <strong>₹{TaxUtils.formatNumber(results.ctx.gross_annual - results.new.total_tax)}</strong>
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
                                    <ResultRow label="Section 80D" oldResult={TaxUtils.SECTION_80D_LIMIT} newResult={0} />
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
        </main>
    );
}

const ResultRow = ({ label, oldResult, newResult, isBold = false, highlight = false }: { label: string, oldResult: number, newResult: number, isBold?: boolean, highlight?: boolean }) => (
    <tr className={`${isBold ? 'bold-row' : ''} ${highlight ? 'highlight-row' : ''}`}>
        <td>{label}</td>
        <td>{TaxUtils.formatNumber(oldResult)}</td>
        <td>{TaxUtils.formatNumber(newResult)}</td>
    </tr>
);
