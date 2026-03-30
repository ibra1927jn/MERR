/**
 * payroll-compliance.integration.test.ts — NZ Payroll Compliance Integration Tests
 *
 * Verifies payroll calculations comply with NZ law using the real
 * nz-payroll-deductions.service and nz-tax-rates config (no mocking of those).
 *
 * References:
 *   - Income Tax Act 2007
 *   - KiwiSaver Act 2006
 *   - Accident Compensation Act 2001
 *   - Holidays Act 2003
 */
import { describe, it, expect, vi } from 'vitest';

// ── Minimal mocks (only external deps) ─────────────────

vi.mock('@/services/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import real services ────────────────────────────────

import { nzPayrollDeductionsService } from '@/services/nz-payroll-deductions.service';
import type { PayrollInput, PayrollDeductions } from '@/services/nz-payroll-deductions.service';

// ── Helpers ─────────────────────────────────────────────

function makeInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    grossEarnings: 926,        // ~$23.15/hr * 40hrs (minimum wage worker)
    hoursWorked: 40,
    kiwisaverRate: 0.03,
    isCasual: true,
    taxCode: 'M',
    hasStudentLoan: false,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────

describe('NZ Payroll Compliance — Integration', () => {
  describe('PAYE (Income Tax Act 2007)', () => {
    it('minimum wage worker gets correct PAYE', () => {
      const input = makeInput({ grossEarnings: 926, isCasual: true });
      const result = nzPayrollDeductionsService.calculate(input);

      // $926 gross + 8% holiday pay = $1000.08 total gross
      // PAYE on ~$1000/week should be positive and reasonable
      expect(result.paye).toBeGreaterThan(0);
      expect(result.paye).toBeLessThan(result.totalGross);
    });

    it('PAYE is progressive (higher earnings = higher effective rate)', () => {
      const lowInput = makeInput({ grossEarnings: 500, isCasual: false });
      const highInput = makeInput({ grossEarnings: 3000, isCasual: false });

      const lowResult = nzPayrollDeductionsService.calculate(lowInput);
      const highResult = nzPayrollDeductionsService.calculate(highInput);

      const lowEffectiveRate = lowResult.paye / lowResult.totalGross;
      const highEffectiveRate = highResult.paye / highResult.totalGross;

      expect(highEffectiveRate).toBeGreaterThan(lowEffectiveRate);
    });

    it('PAYE is 0 for $0 gross', () => {
      const input = makeInput({ grossEarnings: 0, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);
      expect(result.paye).toBe(0);
    });

    it('PAYE calculation uses correct bracket for low earner', () => {
      // $200/week non-casual: entirely in the 10.5% bracket ($0-$300/wk)
      const input = makeInput({ grossEarnings: 200, isCasual: false, kiwisaverRate: 0.03 });
      const result = nzPayrollDeductionsService.calculate(input);

      // $200 is within the first bracket (~$300/wk threshold)
      // At 10.5%, PAYE should be approximately $21
      expect(result.paye).toBeCloseTo(200 * 0.105, 0);
    });
  });

  describe('Holiday Pay (Holidays Act 2003)', () => {
    it('casual worker gets 8% holiday pay', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: true });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.holidayPay).toBe(80); // 8% of $1000
      expect(result.totalGross).toBe(1080);
    });

    it('non-casual worker gets 0 holiday pay (accrued instead)', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.holidayPay).toBe(0);
      expect(result.totalGross).toBe(1000);
    });

    it('holiday pay is included in totalGross before deductions', () => {
      const input = makeInput({ grossEarnings: 500, isCasual: true });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.totalGross).toBe(result.grossEarnings + result.holidayPay);
    });
  });

  describe('KiwiSaver (KiwiSaver Act 2006)', () => {
    it('KiwiSaver at 3% deducts correctly', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.03 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployee).toBe(30); // 3% of $1000
    });

    it('KiwiSaver at 6% deducts correctly', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.06 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployee).toBe(60); // 6% of $1000
    });

    it('KiwiSaver at 10% deducts correctly', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.10 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployee).toBe(100); // 10% of $1000
    });

    it('KiwiSaver at 4% deducts correctly', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.04 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployee).toBe(40);
    });

    it('KiwiSaver at 8% deducts correctly', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.08 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployee).toBe(80);
    });

    it('Employer KiwiSaver minimum is 3%', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.kiwisaverEmployer).toBe(30); // 3% of $1000
    });

    it('Employer KiwiSaver is 3% regardless of employee rate', () => {
      const input10 = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.10 });
      const result10 = nzPayrollDeductionsService.calculate(input10);

      const input3 = makeInput({ grossEarnings: 1000, isCasual: false, kiwisaverRate: 0.03 });
      const result3 = nzPayrollDeductionsService.calculate(input3);

      // Employer minimum is always 3%
      expect(result10.kiwisaverEmployer).toBe(result3.kiwisaverEmployer);
      expect(result10.kiwisaverEmployer).toBe(30);
    });
  });

  describe('ACC Levy (Accident Compensation Act 2001)', () => {
    it('ACC levy is calculated correctly at 1.6%', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      // 1.6% of $1000 = $16
      expect(result.accLevyEmployee).toBe(16);
    });

    it('ACC levy respects annual maximum cap', () => {
      // Very high earner — ACC is capped at annual max / 52
      const input = makeInput({ grossEarnings: 10000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      // ACC max liable annual is $142,283 → weekly cap is ~$2736.21
      const weeklyCap = 142283 / 52;
      const expectedMaxLevy = Math.round(weeklyCap * 0.016 * 100) / 100;

      expect(result.accLevyEmployee).toBeLessThanOrEqual(expectedMaxLevy);
    });
  });

  describe('Student Loan Repayment', () => {
    it('student loan repayment kicks in above $428/week threshold', () => {
      const input = makeInput({
        grossEarnings: 600,
        isCasual: false,
        hasStudentLoan: true,
      });
      const result = nzPayrollDeductionsService.calculate(input);

      // $600 totalGross, threshold $428, rate 12%
      // ($600 - $428) * 0.12 = $20.64
      expect(result.studentLoan).toBeGreaterThan(0);
      expect(result.studentLoan).toBeCloseTo((600 - 428) * 0.12, 1);
    });

    it('student loan is 0 below $428/week threshold', () => {
      const input = makeInput({
        grossEarnings: 400,
        isCasual: false,
        hasStudentLoan: true,
      });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.studentLoan).toBe(0);
    });

    it('student loan is 0 when hasStudentLoan is false', () => {
      const input = makeInput({
        grossEarnings: 2000,
        isCasual: false,
        hasStudentLoan: false,
      });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.studentLoan).toBe(0);
    });

    it('student loan calculated on totalGross (including holiday pay)', () => {
      const input = makeInput({
        grossEarnings: 450,
        isCasual: true,        // Gets 8% holiday pay
        hasStudentLoan: true,
      });
      const result = nzPayrollDeductionsService.calculate(input);

      // totalGross = 450 + 36 = 486
      // SL = (486 - 428) * 0.12 = $6.96
      expect(result.studentLoan).toBeGreaterThan(0);
      expect(result.studentLoan).toBeCloseTo((486 - 428) * 0.12, 1);
    });
  });

  describe('Net Pay Integrity', () => {
    it('netPay = totalGross - totalDeductions (always)', () => {
      const scenarios: Partial<PayrollInput>[] = [
        { grossEarnings: 926, isCasual: true, kiwisaverRate: 0.03, hasStudentLoan: false },
        { grossEarnings: 1500, isCasual: false, kiwisaverRate: 0.06, hasStudentLoan: true },
        { grossEarnings: 300, isCasual: true, kiwisaverRate: 0.10, hasStudentLoan: false },
        { grossEarnings: 5000, isCasual: false, kiwisaverRate: 0.04, hasStudentLoan: true },
        { grossEarnings: 0, isCasual: false, kiwisaverRate: 0.03, hasStudentLoan: false },
      ];

      for (const scenario of scenarios) {
        const input = makeInput(scenario);
        const result = nzPayrollDeductionsService.calculate(input);

        expect(result.netPay).toBeCloseTo(result.totalGross - result.totalDeductions, 2);
      }
    });

    it('totalDeductions = paye + accLevy + kiwisaver + studentLoan', () => {
      const input = makeInput({
        grossEarnings: 1200,
        isCasual: true,
        kiwisaverRate: 0.06,
        hasStudentLoan: true,
      });
      const result = nzPayrollDeductionsService.calculate(input);

      const expectedTotal = result.paye + result.accLevyEmployee + result.kiwisaverEmployee + result.studentLoan;
      expect(result.totalDeductions).toBeCloseTo(expectedTotal, 2);
    });

    it('netPay is always non-negative for reasonable gross', () => {
      const input = makeInput({ grossEarnings: 926, isCasual: true, kiwisaverRate: 0.03 });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.netPay).toBeGreaterThan(0);
    });
  });

  describe('ESCT (Employer Superannuation Contribution Tax)', () => {
    it('ESCT is calculated on employer KiwiSaver contribution', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.esct).toBeGreaterThan(0);
      // ESCT should be a fraction of the employer KS contribution
      expect(result.esct).toBeLessThan(result.kiwisaverEmployer);
    });

    it('ESCT rate depends on annual salary estimate', () => {
      const lowSalary = makeInput({
        grossEarnings: 300,
        isCasual: false,
        annualSalaryEstimate: 15000,
      });
      const highSalary = makeInput({
        grossEarnings: 300,
        isCasual: false,
        annualSalaryEstimate: 200000,
      });

      const lowResult = nzPayrollDeductionsService.calculate(lowSalary);
      const highResult = nzPayrollDeductionsService.calculate(highSalary);

      // Same gross but different ESCT due to different annual salary brackets
      // Low salary ($15k) should get 10.5% ESCT rate
      // High salary ($200k) should get 33% ESCT rate
      expect(highResult.esct).toBeGreaterThan(lowResult.esct);
    });
  });

  describe('Total Employer Cost', () => {
    it('totalEmployerCost includes all employer obligations', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      // totalEmployerCost = totalGross + kiwisaverEmployer + esct + accLevyEmployer
      const expectedCost = result.totalGross + result.kiwisaverEmployer + result.esct + result.accLevyEmployer;
      expect(result.totalEmployerCost).toBeCloseTo(expectedCost, 2);
    });

    it('totalEmployerCost is always greater than totalGross', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.totalEmployerCost).toBeGreaterThan(result.totalGross);
    });

    it('employer ACC work levy is approximately 1.4%', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      // 1.4% of $1000 = $14
      expect(result.accLevyEmployer).toBeCloseTo(14, 0);
    });
  });

  describe('generatePayslip', () => {
    it('returns a formatted string with all payslip sections', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: true, hasStudentLoan: true });
      const payslip = nzPayrollDeductionsService.generatePayslip('Liam O.', input);

      expect(typeof payslip).toBe('string');
      expect(payslip).toContain('PAYSLIP: Liam O.');
      expect(payslip).toContain('Gross Earnings');
      expect(payslip).toContain('Holiday Pay');
      expect(payslip).toContain('Total Gross');
      expect(payslip).toContain('PAYE Tax');
      expect(payslip).toContain('ACC Levy');
      expect(payslip).toContain('KiwiSaver');
      expect(payslip).toContain('Student Loan');
      expect(payslip).toContain('NET PAY');
      expect(payslip).toContain('Employer KiwiSaver');
      expect(payslip).toContain('ESCT');
      expect(payslip).toContain('Total Employer Cost');
    });

    it('omits student loan line when not applicable', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false, hasStudentLoan: false });
      const payslip = nzPayrollDeductionsService.generatePayslip('Jane D.', input);

      expect(payslip).not.toContain('Student Loan');
    });

    it('formats dollar amounts with 2 decimal places', () => {
      const input = makeInput({ grossEarnings: 1000, isCasual: false });
      const payslip = nzPayrollDeductionsService.generatePayslip('Test', input);

      // Check that dollar amounts follow $X.XX pattern
      const dollarPattern = /\$\d+\.\d{2}/;
      expect(dollarPattern.test(payslip)).toBe(true);
    });
  });

  describe('getCurrentRates', () => {
    it('returns current tax year config', () => {
      const rates = nzPayrollDeductionsService.getCurrentRates();

      expect(rates.taxYear).toBeDefined();
      expect(rates.taxYear).toMatch(/^\d{4}-\d{4}$/);
      expect(rates.payeBrackets).toBeDefined();
      expect(rates.payeBrackets.length).toBeGreaterThan(0);
      expect(rates.accEarnerLevy).toBeDefined();
      expect(rates.accMaxLiable).toBeDefined();
      expect(rates.kiwisaverMin).toBe(0.03);
      expect(rates.casualHolidayPay).toBe(0.08);
      expect(rates.annualLeaveWeeks).toBe(4);
      expect(rates.minimumWage).toBeGreaterThanOrEqual(23.15);
    });

    it('PAYE brackets are progressive (rates increase)', () => {
      const rates = nzPayrollDeductionsService.getCurrentRates();
      const brackets = rates.payeBrackets;

      for (let i = 1; i < brackets.length; i++) {
        expect(brackets[i].rate).toBeGreaterThan(brackets[i - 1].rate);
      }
    });

    it('highest PAYE bracket has Infinity upper bound', () => {
      const rates = nzPayrollDeductionsService.getCurrentRates();
      const lastBracket = rates.payeBrackets[rates.payeBrackets.length - 1];

      expect(lastBracket.upTo).toBe(Infinity);
    });
  });

  describe('Edge cases', () => {
    it('handles very small earnings', () => {
      const input = makeInput({ grossEarnings: 1, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.netPay).toBeGreaterThanOrEqual(0);
      expect(result.totalGross).toBe(1);
    });

    it('handles very large earnings', () => {
      const input = makeInput({ grossEarnings: 50000, isCasual: false });
      const result = nzPayrollDeductionsService.calculate(input);

      expect(result.paye).toBeGreaterThan(0);
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBeLessThan(result.totalGross);
    });
  });
});
