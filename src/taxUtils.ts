// Tax year these constants (slabs, rebate limits, deduction caps) implement.
// Update TAX_YEAR together with the numbers below whenever the budget changes them.
// Budget 2026 left all slabs, rebates, deductions and surcharge unchanged, so the
// FY 2026-27 (AY 2027-28) numbers are identical to FY 2025-26.
export const TAX_YEAR = { fy: '2026-27', ay: '2027-28' } as const;

// Cities eligible for the 50% HRA exemption ("metro"). Until FY 2025-26 only
// Delhi, Mumbai, Kolkata and Chennai qualified; the Income Tax Rules 2026 add
// Bengaluru, Hyderabad, Pune and Ahmedabad, effective 1 April 2026 (FY 2026-27).
export const METRO_CITIES = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Ahmedabad'] as const;

// Financial Year 2026-27 (Assessment Year 2027-28) Tax Constants
export const HEALTH_AND_EDUCATION_CESS_RATE = 0.04;
export const STANDARD_DEDUCTION = 50_000.0;

// Old Tax Regime
export const OLD_REGIME_REBATE_LIMIT = 500_000.0;
export const SECTION_80C_LIMIT = 150_000.0;
export const SECTION_80D_LIMIT = 50_000.0;
export const NPS_80CCD1B_LIMIT = 50_000.0; // Additional NPS deduction (old regime only)

// Meal vouchers / food cards: ₹200 per meal × 2 meals × ~22 working days × 12
// months (Income Tax Rules 2026, Rule 15(5)(a), w.e.f. 1 Apr 2026). Tax-free in
// BOTH regimes now that the earlier new-regime denial proviso has been dropped.
export const MEAL_VOUCHER_ANNUAL_LIMIT = 105_600.0; // 200 * 2 * 22 * 12

// New Tax Regime (Default)
export const NEW_REGIME_REBATE_LIMIT = 1_200_000.0;
export const NEW_REGIME_STANDARD_DEDUCTION = 75_000.0;

export interface SalaryInput {
    claim_hra: boolean;
    is_metro_city: boolean;
    pf_included: boolean;
    include_nps: boolean;
    include_meal_vouchers: boolean;
}

export interface SalaryContext extends SalaryInput {
    gross_annual: number;
    basic: number;
    hra: number;
    pf_employee: number;
    pf_employer: number;
    total_pf: number;
}

export interface Deductions {
    hra_exemption: number;
    c80_deduction: number;
    d80_deduction: number;
    nps_deduction: number;
    meal_voucher: number;
    standard_deduction: number;
    pf_employer: number;
    total_deductions: number;
}

export interface TaxResult extends Deductions {
    regime_name: string;
    taxable_income: number;
    income_tax: number;
    surcharge: number;
    cess: number;
    total_tax: number;
    net_annual: number;
    total_pf: number;        // employee + employer PF (annual)
    monthly_in_hand: number; // liquid cash you actually receive
    monthly_locked: number;  // PF + NPS + meal vouchers — yours, but not liquid cash
    monthly_total: number;   // net_annual / 12
}

export function createSalaryContext(gross_annual: number, input: SalaryInput): SalaryContext {
    const basic = gross_annual * 0.5;
    // HRA exemption applies only if claimed (old regime); metro gets 50% of basic, else 40%.
    const hra = input.claim_hra ? basic * (input.is_metro_city ? 0.5 : 0.4) : 0;
    const pf_employee = input.pf_included ? basic * 0.12 : 0;
    const pf_employer = input.pf_included ? basic * 0.12 : 0;
    return { ...input, gross_annual, basic, hra, pf_employee, pf_employer, total_pf: pf_employee + pf_employer };
}

export function calculateSurcharge(taxable_income: number, tax_payable: number, regime_name: string): number {
    if (taxable_income <= 5_000_000) return 0.0;
    if (taxable_income <= 10_000_000) return tax_payable * 0.10;
    if (taxable_income <= 20_000_000) return tax_payable * 0.15;
    if (taxable_income <= 50_000_000) return tax_payable * 0.25;
    // Over 5 Crores — new regime caps the surcharge at 25%.
    return tax_payable * (regime_name === "New Regime" ? 0.25 : 0.37);
}

function oldRegimeSlabTax(ti: number): number {
    if (ti <= 250_000) return 0.0;
    if (ti <= 500_000) return (ti - 250_000) * 0.05;
    if (ti <= 1_000_000) return 12_500 + (ti - 500_000) * 0.20;
    return 112_500 + (ti - 1_000_000) * 0.30;
}

function newRegimeSlabTax(ti: number): number {
    if (ti <= 400_000) return 0.0;
    if (ti <= 800_000) return (ti - 400_000) * 0.05;
    if (ti <= 1_200_000) return 20_000 + (ti - 800_000) * 0.10;
    if (ti <= 1_600_000) return 60_000 + (ti - 1_200_000) * 0.15;
    if (ti <= 2_000_000) return 120_000 + (ti - 1_600_000) * 0.20;
    if (ti <= 2_400_000) return 200_000 + (ti - 2_000_000) * 0.25;
    return 300_000 + (ti - 2_400_000) * 0.30;
}

// Shared tail: turn a base-slab tax into the full result, including the
// liquid/locked split for take-home. `locked_extras` (voluntary NPS, meal
// vouchers) are amounts you can't spend as free cash, so they leave your
// in-hand alongside PF and land in the locked bucket instead.
function assembleResult(
    ctx: SalaryContext,
    regime_name: string,
    taxable_income: number,
    base_tax: number,
    locked_extras: number,
    d: Deductions,
): TaxResult {
    const surcharge = calculateSurcharge(taxable_income, base_tax, regime_name);
    const cess = (base_tax + surcharge) * HEALTH_AND_EDUCATION_CESS_RATE;
    const total_tax = base_tax + surcharge + cess;

    const net_annual = ctx.gross_annual - total_tax;
    const locked = ctx.total_pf + locked_extras;
    const monthly_in_hand = (net_annual - locked) / 12;
    const monthly_locked = locked / 12;

    return {
        ...d,
        regime_name,
        taxable_income,
        income_tax: base_tax,
        surcharge,
        cess,
        total_tax,
        net_annual,
        total_pf: ctx.total_pf,
        monthly_in_hand,
        monthly_locked,
        monthly_total: monthly_in_hand + monthly_locked,
    };
}

export function calculateOldRegimeTax(ctx: SalaryContext): TaxResult {
    const nps_deduction = ctx.include_nps ? NPS_80CCD1B_LIMIT : 0;
    const meal_voucher = ctx.include_meal_vouchers ? MEAL_VOUCHER_ANNUAL_LIMIT : 0;
    const d: Deductions = {
        standard_deduction: STANDARD_DEDUCTION,
        hra_exemption: ctx.hra,
        c80_deduction: SECTION_80C_LIMIT,
        d80_deduction: SECTION_80D_LIMIT,
        nps_deduction,
        meal_voucher,
        pf_employer: ctx.pf_employer,
        total_deductions: 0,
    };
    d.total_deductions =
        d.standard_deduction + d.hra_exemption + d.c80_deduction + d.d80_deduction + d.nps_deduction + d.meal_voucher + d.pf_employer;

    const taxable_income = Math.max(0.0, ctx.gross_annual - d.total_deductions);
    // Old regime 87A rebate is a hard cliff at ₹5L (no statutory marginal relief).
    const base_tax = taxable_income > OLD_REGIME_REBATE_LIMIT ? oldRegimeSlabTax(taxable_income) : 0.0;

    // Voluntary NPS and meal vouchers are set aside / food-only, so they reduce liquid in-hand.
    return assembleResult(ctx, "Old Regime", taxable_income, base_tax, nps_deduction + meal_voucher, d);
}

export function calculateNewRegimeTax(ctx: SalaryContext): TaxResult {
    const meal_voucher = ctx.include_meal_vouchers ? MEAL_VOUCHER_ANNUAL_LIMIT : 0;
    const d: Deductions = {
        standard_deduction: NEW_REGIME_STANDARD_DEDUCTION,
        hra_exemption: 0,
        c80_deduction: 0,
        d80_deduction: 0,
        nps_deduction: 0,
        meal_voucher,
        pf_employer: ctx.pf_employer,
        total_deductions: NEW_REGIME_STANDARD_DEDUCTION + ctx.pf_employer + meal_voucher,
    };

    const taxable_income = Math.max(0.0, ctx.gross_annual - d.total_deductions);
    let base_tax = newRegimeSlabTax(taxable_income);
    if (taxable_income <= NEW_REGIME_REBATE_LIMIT) {
        base_tax = 0.0; // Section 87A rebate makes tax nil up to the rebate limit.
    } else {
        // Marginal relief: tax cannot exceed the income earned above the rebate limit.
        base_tax = Math.min(base_tax, taxable_income - NEW_REGIME_REBATE_LIMIT);
    }

    // Meal vouchers apply in the new regime too (Income Tax Rules 2026) and are food-only, so locked.
    return assembleResult(ctx, "New Regime", taxable_income, base_tax, meal_voucher, d);
}

export const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));
