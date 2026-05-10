// Financial Year 2025-26 (Assessment Year 2026-27) Tax Constants
export const HEALTH_AND_EDUCATION_CESS_RATE = 0.04;
export const STANDARD_DEDUCTION = 50_000.0;

// Old Tax Regime
export const OLD_REGIME_REBATE_LIMIT = 500_000.0;
export const SECTION_80C_LIMIT = 150_000.0;
export const SECTION_80D_LIMIT = 50_000.0;

// New Tax Regime (Default)
export const NEW_REGIME_REBATE_LIMIT = 1_200_000.0;
export const NEW_REGIME_STANDARD_DEDUCTION = 75_000.0;

export interface SalaryContext {
    gross_annual: number;
    is_metro_city: boolean;
    pf_included: boolean;
    basic: number;
    hra: number;
    pf_employee: number;
    pf_employer: number;
    total_pf: number;
}

export interface TaxResult {
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

export function createSalaryContext(gross_annual: number, is_metro_city: boolean, pf_included: boolean): SalaryContext {
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

export function calculateSurcharge(taxable_income: number, tax_payable: number, regime_name: string): number {
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

export function calculateOldRegimeTax(ctx: SalaryContext): TaxResult {
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
    
    const surcharge = calculateSurcharge(taxable_income, tax, "Old Regime");
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

export function calculateNewRegimeTax(ctx: SalaryContext): TaxResult {
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

    const surcharge = calculateSurcharge(taxable_income, tax, "New Regime");
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

export const formatNumber = (num: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
