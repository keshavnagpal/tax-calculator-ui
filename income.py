import argparse
from dataclasses import dataclass

# Financial Year 2025-26 (Assessment Year 2026-27) Tax Constants
# Source: Income Tax Department of India
# Common
HEALTH_AND_EDUCATION_CESS_RATE = 0.04
STANDARD_DEDUCTION = 50_000.0

# Old Tax Regime
OLD_REGIME_REBATE_LIMIT = 500_000.0
SECTION_80C_LIMIT = 150_000.0
SECTION_80D_LIMIT = 50_000.0

# New Tax Regime (Default)
NEW_REGIME_REBATE_LIMIT = 1_200_000.0
NEW_REGIME_STANDARD_DEDUCTION = 75_000.0


@dataclass
class SalaryContext:
    """Holds all salary and user-provided context."""
    gross_annual: float
    is_metro_city: bool
    pf_included: bool

    # Derived values
    basic: float = 0.0
    hra: float = 0.0
    pf_employee: float = 0.0
    pf_employer: float = 0.0
    total_pf: float = 0.0

    def __post_init__(self):
        """Calculate derived salary components after initialization."""
        self.basic = self.gross_annual * 0.5
        hra_rate = 0.5 if self.is_metro_city else 0.4
        self.hra = self.basic * hra_rate

        if self.pf_included:
            self.pf_employee = self.basic * 0.12
            self.pf_employer = self.basic * 0.12
        self.total_pf = self.pf_employee + self.pf_employer


@dataclass
class TaxResult:
    """Holds the calculated tax details for a single regime."""
    regime_name: str
    taxable_income: float
    income_tax: float
    surcharge: float
    cess: float
    total_tax: float
    monthly_in_hand: float
    monthly_pf: float
    monthly_total: float
    hra_exemption: float = 0.0
    c80_deduction: float = 0.0
    standard_deduction: float = 0.0
    total_deductions: float = 0.0


def _calculate_surcharge(taxable_income: float, tax_payable: float, regime_name: str) -> float:
    """Calculates income tax surcharge based on the regime.

    Note: This calculation does not include marginal relief, which may apply
    if the income is slightly above the surcharge thresholds.
    """
    if taxable_income <= 5_000_000:
        return 0.0

    if taxable_income <= 10_000_000:
        rate = 0.10
    elif taxable_income <= 20_000_000:
        rate = 0.15
    elif taxable_income <= 50_000_000:
        rate = 0.25
    else:  # Over 5 Crores
        if regime_name == "New Regime":
            rate = 0.25  # Surcharge capped at 25% for New Regime
        else:
            rate = 0.37
    
    return tax_payable * rate


def calculate_old_regime_tax(ctx: SalaryContext) -> TaxResult:
    """Calculates taxes based on the Old Tax Regime."""
    # 1. Calculate HRA Exemption (assuming maximum possible deduction)
    hra_exemption = ctx.hra

    # 2. Calculate 80C Deductions
    c80_deduction = min(ctx.pf_employee, SECTION_80C_LIMIT)

    # 3. Standard Deduction
    standard_deduction = STANDARD_DEDUCTION

    # 4. Calculate total taxable income
    total_deductions = hra_exemption + c80_deduction + standard_deduction + SECTION_80D_LIMIT
    taxable_income = ctx.gross_annual - total_deductions
    taxable_income = max(0.0, taxable_income)

    # 5. Apply tax slabs
    if taxable_income <= OLD_REGIME_REBATE_LIMIT:
        tax = 0.0
    else:
        if taxable_income <= 250_000:
            tax = 0.0
        elif taxable_income <= 500_000:
            tax = (taxable_income - 250_000) * 0.05
        elif taxable_income <= 1_000_000:
            tax = 12_500 + (taxable_income - 500_000) * 0.20
        else:
            tax = 112_500 + (taxable_income - 1_000_000) * 0.30

    # 6. Calculate Surcharge and Cess
    surcharge = _calculate_surcharge(taxable_income, tax, "Old Regime")
    cess = (tax + surcharge) * HEALTH_AND_EDUCATION_CESS_RATE
    total_tax = tax + surcharge + cess

    # 7. Calculate in-hand salary
    cash_salary = ctx.gross_annual - ctx.total_pf - total_tax
    monthly_in_hand = cash_salary / 12
    monthly_pf = ctx.total_pf / 12

    return TaxResult(
        regime_name="Old Regime",
        taxable_income=taxable_income,
        income_tax=tax,
        surcharge=surcharge,
        cess=cess,
        total_tax=total_tax,
        monthly_in_hand=monthly_in_hand,
        monthly_pf=monthly_pf,
        monthly_total=monthly_in_hand + monthly_pf,
        hra_exemption=hra_exemption,
        c80_deduction=c80_deduction,
        standard_deduction=standard_deduction,
        total_deductions=total_deductions
    )


def calculate_new_regime_tax(ctx: SalaryContext) -> TaxResult:
    """Calculates taxes based on the New Tax Regime (FY 2025-26)."""
    # 1. Calculate taxable income
    standard_deduction = NEW_REGIME_STANDARD_DEDUCTION
    total_deductions = standard_deduction
    taxable_income = ctx.gross_annual - total_deductions
    taxable_income = max(0.0, taxable_income)

    # 2. Apply tax slabs
    if taxable_income <= NEW_REGIME_REBATE_LIMIT:
        tax = 0.0
    else:
        if taxable_income <= 400_000:
            tax = 0.0
        elif taxable_income <= 800_000:
            tax = (taxable_income - 400_000) * 0.05
        elif taxable_income <= 1_200_000:
            tax = 20_000 + (taxable_income - 800_000) * 0.10
        elif taxable_income <= 1_600_000:
            tax = 60_000 + (taxable_income - 1_200_000) * 0.15
        elif taxable_income <= 2_000_000:
            tax = 120_000 + (taxable_income - 1_600_000) * 0.20
        elif taxable_income <= 2_400_000:
            tax = 200_000 + (taxable_income - 2_000_000) * 0.25
        else:
            tax = 300_000 + (taxable_income - 2_400_000) * 0.30

    # 3. Calculate Surcharge and Cess
    surcharge = _calculate_surcharge(taxable_income, tax, "New Regime")
    cess = (tax + surcharge) * HEALTH_AND_EDUCATION_CESS_RATE
    total_tax = tax + surcharge + cess

    # 4. Calculate in-hand salary
    cash_salary = ctx.gross_annual - ctx.total_pf - total_tax
    monthly_in_hand = cash_salary / 12
    monthly_pf = ctx.total_pf / 12

    return TaxResult(
        regime_name="New Regime",
        taxable_income=taxable_income,
        income_tax=tax,
        surcharge=surcharge,
        cess=cess,
        total_tax=total_tax,
        monthly_in_hand=monthly_in_hand,
        monthly_pf=monthly_pf,
        monthly_total=monthly_in_hand + monthly_pf,
        standard_deduction=standard_deduction,
        total_deductions=total_deductions
    )


def display_results(ctx: SalaryContext, old: TaxResult, new: TaxResult):
    """Prints a formatted comparison of the two tax regimes."""

    report = f"""
--- Salary & Tax Comparison (FY 2025-26) ---

{'':<28} | {old.regime_name:<20} | {new.regime_name:<20}
---------------------------------------------------------------------------
{'Gross Annual Salary:':<28} | {ctx.gross_annual:18,.0f} | {ctx.gross_annual:18,.0f}
---------------------------------------------------------------------------
{'Exemptions & Deductions':<28} | {'':<18} | {'':<20}
  {'HRA Exemption':<26} | {old.hra_exemption:18,.0f} | {new.hra_exemption:18,.0f}
  {'Section 80C Deduction':<26} | {old.c80_deduction:18,.0f} | {new.c80_deduction:18,.0f}
  {'Section 80D Deduction':<26} | {SECTION_80D_LIMIT:18,.0f} | {0:18,.0f}
  {'Standard Deduction':<26} | {old.standard_deduction:18,.0f} | {new.standard_deduction:18,.0f}
{'Total Deductions:':<28} | {old.total_deductions:18,.0f} | {new.total_deductions:18,.0f}
---------------------------------------------------------------------------
{'Taxable Income:':<28} | {old.taxable_income:18,.0f} | {new.taxable_income:18,.0f}
---------------------------------------------------------------------------
{'Tax Calculation':<28} | {'':<18} | {'':<20}
  {'Income Tax':<26} | {old.income_tax:18,.0f} | {new.income_tax:18,.0f}
  {'Surcharge':<26} | {old.surcharge:18,.0f} | {new.surcharge:18,.0f}
  {'Health & Edu Cess':<26} | {old.cess:18,.0f} | {new.cess:18,.0f}
{'Total Annual Tax:':<28} | {old.total_tax:18,.0f} | {new.total_tax:18,.0f}
---------------------------------------------------------------------------
{'Net Annual Income:':<28} | {(ctx.gross_annual - old.total_tax):18,.0f} | {(ctx.gross_annual - new.total_tax):18,.0f}
{'Monthly In-Hand:':<28} | {old.monthly_in_hand:18,.0f} | {new.monthly_in_hand:18,.0f}
{'Monthly PF Contribution:':<28} | {old.monthly_pf:18,.0f} | {new.monthly_pf:18,.0f}
{'Monthly Total:':<28} | {old.monthly_total:18,.0f} | {new.monthly_total:18,.0f}

--- End of Report ---
"""

    if ctx.gross_annual > 10_000_000:
        report += "\nNOTE: Your income is high. It is advisable to consult a CA for detailed tax planning.\n"

    print(report)


def main():
    """Main function to parse arguments and run the calculator."""
    parser = argparse.ArgumentParser(
        description="Calculates and compares in-hand income under Old and New Tax Regimes for FY 2025-26.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("-s", "--salary", type=float, required=True, help="Your gross annual salary (CTC).")
    parser.add_argument("--metro", action=argparse.BooleanOptionalAction, default=True, help="If you live in a metro city (e.g., Delhi, Mumbai).")
    parser.add_argument("--pf", action=argparse.BooleanOptionalAction, default=True, help="If Provident Fund is part of your CTC.")
    args = parser.parse_args()

    # Create context and run calculations
    salary_context = SalaryContext(
        gross_annual=args.salary,
        is_metro_city=args.metro,
        pf_included=args.pf,
    )
    old_regime_result = calculate_old_regime_tax(salary_context)
    new_regime_result = calculate_new_regime_tax(salary_context)

    # Display results
    display_results(salary_context, old_regime_result, new_regime_result)


if __name__ == "__main__":
    main()
