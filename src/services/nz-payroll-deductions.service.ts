/**
 * NZ Payroll Deductions Service
 *
 * AUDIT C-1 Fix: Implements mandatory NZ payroll calculations:
 *   - PAYE (Pay As You Earn) tax withholding
 *   - KiwiSaver employee + employer contributions
 *   - ACC earner's levy
 *   - ESCT (Employer Superannuation Contribution Tax)
 *   - Holiday pay (8% for casual/seasonal workers)
 *
 * Tax rates: 2025/26 NZ tax year
 * References:
 *   - Income Tax Act 2007
 *   - KiwiSaver Act 2006
 *   - Accident Compensation Act 2001
 *   - Holidays Act 2003
 *
 * @module services/nz-payroll-deductions
 */

// ── PAYE Tax Brackets (2025/26) ──────────────────
// Weekly thresholds (annual / 52)
const PAYE_BRACKETS = [
  { upTo: 269.23, rate: 0.105 }, // $0 – $14,000/yr → 10.5%
  { upTo: 923.08, rate: 0.175 }, // $14,001 – $48,000/yr → 17.5%
  { upTo: 1346.15, rate: 0.3 }, // $48,001 – $70,000/yr → 30%
  { upTo: 3461.54, rate: 0.33 }, // $70,001 – $180,000/yr → 33%
  { upTo: Infinity, rate: 0.39 }, // $180,001+ → 39%
] as const;

// ── ACC Earner's Levy (2025/26) ──────────────────
const ACC_EARNER_LEVY_RATE = 0.016; // 1.60% of gross earnings
const ACC_MAX_LIABLE = 142_283; // Annual maximum liable earnings

// ── KiwiSaver Rates ──────────────────────────────
export type KiwiSaverRate = 0.03 | 0.04 | 0.06 | 0.08 | 0.1;
const KIWISAVER_EMPLOYER_MIN = 0.03; // Employer compulsory contribution 3%

// ── ESCT Brackets (Employer Superannuation Contribution Tax) ──
const ESCT_BRACKETS = [
  { upTo: 16800, rate: 0.105 },
  { upTo: 57600, rate: 0.175 },
  { upTo: 84000, rate: 0.3 },
  { upTo: 216000, rate: 0.33 },
  { upTo: Infinity, rate: 0.39 },
] as const;

// ── Holiday Pay ──────────────────────────────────
const CASUAL_HOLIDAY_PAY_RATE = 0.08; // 8% for casual/seasonal workers
const ANNUAL_LEAVE_WEEKS = 4; // 4 weeks annual leave

// ── Types ──────────────────────────────────────
export interface PayrollInput {
  grossEarnings: number; // Weekly gross (piece-rate + top-up)
  hoursWorked: number; // For record-keeping
  kiwisaverRate: KiwiSaverRate; // Employee's chosen KS rate
  isCasual: boolean; // Casual/seasonal → 8% holiday pay
  taxCode: string; // e.g. 'M', 'ME', 'SB', 'S', 'SH'
  hasStudentLoan: boolean; // SL repayment
  annualSalaryEstimate?: number; // For ESCT calculation
}

export interface PayrollDeductions {
  grossEarnings: number;
  holidayPay: number; // 8% holiday pay (casual) or accrued
  totalGross: number; // gross + holiday pay
  paye: number; // PAYE tax
  accLevyEmployee: number; // ACC earner's levy
  kiwisaverEmployee: number; // KS employee contribution
  studentLoan: number; // SL repayment
  totalDeductions: number; // Sum of all deductions
  netPay: number; // totalGross - totalDeductions
  // Employer costs (not deducted from employee)
  kiwisaverEmployer: number; // KS employer contribution
  esct: number; // ESCT on employer KS contribution
  accLevyEmployer: number; // Work levy (employer's share)
  totalEmployerCost: number; // totalGross + employer costs
}

// ── Service ──────────────────────────────────────

export const nzPayrollDeductionsService = {
  /**
   * Calculate all NZ payroll deductions for a single pay period (weekly).
   */
  calculate(input: PayrollInput): PayrollDeductions {
    const { grossEarnings, kiwisaverRate, isCasual, hasStudentLoan } = input;

    // 1. Holiday Pay (Holidays Act 2003)
    const holidayPay = isCasual
      ? Math.round(grossEarnings * CASUAL_HOLIDAY_PAY_RATE * 100) / 100
      : 0; // Non-casual accrues leave, not pay-as-you-go

    const totalGross = Math.round((grossEarnings + holidayPay) * 100) / 100;

    // 2. PAYE (Income Tax Act 2007) — progressive brackets
    const paye = this.calculatePAYE(totalGross);

    // 3. ACC Earner's Levy (weekly cap: annual max / 52)
    const accWeeklyCap = ACC_MAX_LIABLE / 52;
    const accLiableEarnings = Math.min(totalGross, accWeeklyCap);
    const accLevyEmployee = Math.round(accLiableEarnings * ACC_EARNER_LEVY_RATE * 100) / 100;

    // 4. KiwiSaver Employee Contribution
    const kiwisaverEmployee = Math.round(totalGross * kiwisaverRate * 100) / 100;

    // 5. Student Loan Repayment (12% of income over $428/week threshold)
    const SL_THRESHOLD_WEEKLY = 428;
    const SL_RATE = 0.12;
    const studentLoan =
      hasStudentLoan && totalGross > SL_THRESHOLD_WEEKLY
        ? Math.round((totalGross - SL_THRESHOLD_WEEKLY) * SL_RATE * 100) / 100
        : 0;

    // Total Deductions (from employee's pay)
    const totalDeductions =
      Math.round((paye + accLevyEmployee + kiwisaverEmployee + studentLoan) * 100) / 100;

    const netPay = Math.round((totalGross - totalDeductions) * 100) / 100;

    // 6. Employer Costs
    const kiwisaverEmployer = Math.round(totalGross * KIWISAVER_EMPLOYER_MIN * 100) / 100;
    const annualEstimate = input.annualSalaryEstimate || totalGross * 52;
    const esct = Math.round(this.calculateESCT(kiwisaverEmployer, annualEstimate) * 100) / 100;
    const accLevyEmployer = Math.round(accLiableEarnings * 0.014 * 100) / 100; // ~1.4% work levy

    const totalEmployerCost =
      Math.round((totalGross + kiwisaverEmployer + esct + accLevyEmployer) * 100) / 100;

    return {
      grossEarnings,
      holidayPay,
      totalGross,
      paye,
      accLevyEmployee,
      kiwisaverEmployee,
      studentLoan,
      totalDeductions,
      netPay,
      kiwisaverEmployer,
      esct,
      accLevyEmployer,
      totalEmployerCost,
    };
  },

  /**
   * Progressive PAYE calculation on weekly earnings.
   */
  calculatePAYE(weeklyGross: number): number {
    let remaining = weeklyGross;
    let tax = 0;
    let prevThreshold = 0;

    for (const bracket of PAYE_BRACKETS) {
      const taxable = Math.min(remaining, bracket.upTo - prevThreshold);
      if (taxable <= 0) break;
      tax += taxable * bracket.rate;
      remaining -= taxable;
      prevThreshold = bracket.upTo;
    }

    return Math.round(tax * 100) / 100;
  },

  /**
   * Calculate ESCT on employer KiwiSaver contribution.
   * Rate based on employee's estimated annual salary + employer KS contribution.
   */
  calculateESCT(weeklyEmployerKS: number, annualSalary: number): number {
    const total = annualSalary + weeklyEmployerKS * 52;
    let rate = 0.105;
    for (const bracket of ESCT_BRACKETS) {
      if (total <= bracket.upTo) {
        rate = bracket.rate;
        break;
      }
    }
    return weeklyEmployerKS * rate;
  },

  /**
   * Calculate annual leave entitlement.
   */
  getAnnualLeaveEntitlement(weeksWorked: number, weeklyRate: number) {
    const entitlementWeeks = Math.min(ANNUAL_LEAVE_WEEKS, (weeksWorked / 52) * ANNUAL_LEAVE_WEEKS);
    return {
      weeksAccrued: Math.round(entitlementWeeks * 100) / 100,
      dollarValue: Math.round(entitlementWeeks * weeklyRate * 100) / 100,
    };
  },

  /**
   * Generate payslip summary for one worker.
   */
  generatePayslip(workerName: string, input: PayrollInput): string {
    const d = this.calculate(input);
    return [
      `=== PAYSLIP: ${workerName} ===`,
      `Gross Earnings:    $${d.grossEarnings.toFixed(2)}`,
      `Holiday Pay (8%):  $${d.holidayPay.toFixed(2)}`,
      `Total Gross:       $${d.totalGross.toFixed(2)}`,
      `---`,
      `PAYE Tax:         -$${d.paye.toFixed(2)}`,
      `ACC Levy:         -$${d.accLevyEmployee.toFixed(2)}`,
      `KiwiSaver (${(input.kiwisaverRate * 100).toFixed(0)}%): -$${d.kiwisaverEmployee.toFixed(2)}`,
      d.studentLoan > 0 ? `Student Loan:     -$${d.studentLoan.toFixed(2)}` : null,
      `Total Deductions: -$${d.totalDeductions.toFixed(2)}`,
      `===`,
      `NET PAY:           $${d.netPay.toFixed(2)}`,
      `===`,
      `Employer KiwiSaver: $${d.kiwisaverEmployer.toFixed(2)}`,
      `Employer ACC Work:  $${d.accLevyEmployer.toFixed(2)}`,
      `ESCT:               $${d.esct.toFixed(2)}`,
      `Total Employer Cost: $${d.totalEmployerCost.toFixed(2)}`,
    ]
      .filter(Boolean)
      .join('\n');
  },

  /** Get current tax rates for display */
  getCurrentRates() {
    return {
      payeBrackets: PAYE_BRACKETS,
      accEarnerLevy: ACC_EARNER_LEVY_RATE,
      accMaxLiable: ACC_MAX_LIABLE,
      kiwisaverMin: KIWISAVER_EMPLOYER_MIN,
      casualHolidayPay: CASUAL_HOLIDAY_PAY_RATE,
      annualLeaveWeeks: ANNUAL_LEAVE_WEEKS,
    };
  },
};
