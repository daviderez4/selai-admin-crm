/**
 * SELAI Insurance Integration Hub
 * Data Enricher - Enhance customer data with derived insights
 */

import { Customer, Policy, PensionAccount, Claim } from '../../models/canonical.js';
import { CoverageGap, CoverageAnalysis } from '../../models/database-types.js';

// ============================================
// TYPES
// ============================================

export interface EnrichedCustomer extends Customer {
  enrichment: CustomerEnrichment;
}

export interface CustomerEnrichment {
  age?: number;
  age_group?: 'young' | 'adult' | 'middle_aged' | 'senior' | 'elderly';
  life_stage?: 'student' | 'young_professional' | 'family' | 'established' | 'pre_retirement' | 'retired';
  risk_profile?: 'conservative' | 'moderate' | 'aggressive';
  customer_value?: 'low' | 'medium' | 'high' | 'premium';
  churn_risk?: 'low' | 'medium' | 'high';
  upsell_potential?: 'low' | 'medium' | 'high';
  next_best_actions?: string[];
  derived_at: string;
}

export interface EnrichedPolicy extends Policy {
  enrichment: PolicyEnrichment;
}

export interface PolicyEnrichment {
  days_until_expiry?: number;
  is_expiring_soon: boolean;
  annual_premium: number;
  coverage_adequacy?: 'under' | 'adequate' | 'over';
  price_competitiveness?: 'cheap' | 'fair' | 'expensive';
  renewal_probability?: number;
  derived_at: string;
}

export interface PortfolioEnrichment {
  total_policies: number;
  active_policies: number;
  total_annual_premium: number;
  total_coverage: number;
  coverage_types: string[];
  missing_coverage_types: string[];
  concentration_risk: number;
  diversification_score: number;
  overall_health: 'poor' | 'fair' | 'good' | 'excellent';
}

// ============================================
// DATA ENRICHER CLASS
// ============================================

export class DataEnricher {
  /**
   * Enrich customer with derived data
   */
  enrichCustomer(
    customer: Customer,
    policies: Policy[] = [],
    pensionAccounts: PensionAccount[] = [],
    claims: Claim[] = []
  ): EnrichedCustomer {
    const age = this.calculateAge(customer.birth_date);
    const ageGroup = this.getAgeGroup(age);
    const lifeStage = this.getLifeStage(age, customer.marital_status, policies);

    // Calculate customer value based on premium and tenure
    const totalPremium = this.calculateTotalAnnualPremium(policies);
    const customerValue = this.getCustomerValue(totalPremium, policies.length);

    // Calculate risk profile
    const riskProfile = this.getRiskProfile(customer, pensionAccounts);

    // Calculate churn risk
    const churnRisk = this.getChurnRisk(policies, claims);

    // Calculate upsell potential
    const upsellPotential = this.getUpsellPotential(customer, policies, age);

    // Generate next best actions
    const nextBestActions = this.getNextBestActions(
      customer,
      policies,
      pensionAccounts,
      claims,
      age
    );

    return {
      ...customer,
      enrichment: {
        age,
        age_group: ageGroup,
        life_stage: lifeStage,
        risk_profile: riskProfile,
        customer_value: customerValue,
        churn_risk: churnRisk,
        upsell_potential: upsellPotential,
        next_best_actions: nextBestActions,
        derived_at: new Date().toISOString()
      }
    };
  }

  /**
   * Enrich policy with derived data
   */
  enrichPolicy(policy: Policy): EnrichedPolicy {
    const daysUntilExpiry = this.calculateDaysUntilExpiry(policy.end_date);
    const annualPremium = this.calculateAnnualPremium(policy);

    return {
      ...policy,
      enrichment: {
        days_until_expiry: daysUntilExpiry,
        is_expiring_soon: daysUntilExpiry !== undefined && daysUntilExpiry <= 30,
        annual_premium: annualPremium,
        derived_at: new Date().toISOString()
      }
    };
  }

  /**
   * Enrich portfolio analysis
   */
  enrichPortfolio(
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): PortfolioEnrichment {
    const activePolicies = policies.filter(p => p.status === 'active');
    const coverageTypes = [...new Set(activePolicies.map(p => p.insurance_type))];

    // Define essential coverage types
    const essentialTypes = ['life', 'health', 'home', 'car'];
    const missingTypes = essentialTypes.filter(t => !coverageTypes.includes(t as any));

    // Calculate concentration risk (how much premium is in single carrier)
    const carrierPremiums = new Map<string, number>();
    for (const policy of activePolicies) {
      const current = carrierPremiums.get(policy.insurance_company) || 0;
      carrierPremiums.set(
        policy.insurance_company,
        current + this.calculateAnnualPremium(policy)
      );
    }

    const totalPremium = this.calculateTotalAnnualPremium(activePolicies);
    const maxCarrierPremium = Math.max(...carrierPremiums.values(), 0);
    const concentrationRisk = totalPremium > 0 ? maxCarrierPremium / totalPremium : 0;

    // Diversification score (more types = better, max 100)
    const diversificationScore = Math.min(100, (coverageTypes.length / essentialTypes.length) * 100);

    // Overall health
    const overallHealth = this.getPortfolioHealth(
      coverageTypes.length,
      missingTypes.length,
      concentrationRisk,
      pensionAccounts.length
    );

    return {
      total_policies: policies.length,
      active_policies: activePolicies.length,
      total_annual_premium: totalPremium,
      total_coverage: activePolicies.reduce(
        (sum, p) => sum + (p.coverage?.primary_coverage || 0),
        0
      ),
      coverage_types: coverageTypes,
      missing_coverage_types: missingTypes,
      concentration_risk: Math.round(concentrationRisk * 100),
      diversification_score: Math.round(diversificationScore),
      overall_health: overallHealth
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateAge(birthDate?: string): number | undefined {
    if (!birthDate) return undefined;

    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  private getAgeGroup(age?: number): CustomerEnrichment['age_group'] {
    if (!age) return undefined;
    if (age < 25) return 'young';
    if (age < 35) return 'adult';
    if (age < 50) return 'middle_aged';
    if (age < 65) return 'senior';
    return 'elderly';
  }

  private getLifeStage(
    age?: number,
    maritalStatus?: string,
    policies?: Policy[]
  ): CustomerEnrichment['life_stage'] {
    if (!age) return undefined;

    const hasHomePolicy = policies?.some(p => p.insurance_type === 'home');
    const hasLifePolicy = policies?.some(p => p.insurance_type === 'life');

    if (age < 25) return 'student';
    if (age < 30) return 'young_professional';
    if (age < 45 && (maritalStatus === 'married' || hasLifePolicy)) return 'family';
    if (age < 55) return 'established';
    if (age < 65) return 'pre_retirement';
    return 'retired';
  }

  private getRiskProfile(
    customer: Customer,
    pensionAccounts: PensionAccount[]
  ): CustomerEnrichment['risk_profile'] {
    // Simple heuristic based on pension fund types
    const hasGemelInvestment = pensionAccounts.some(
      p => p.account_type === 'gemel_investment'
    );
    const hasProvidentFund = pensionAccounts.some(
      p => p.account_type === 'provident_fund'
    );

    if (hasGemelInvestment) return 'aggressive';
    if (hasProvidentFund) return 'moderate';
    return 'conservative';
  }

  private getCustomerValue(
    totalPremium: number,
    policyCount: number
  ): CustomerEnrichment['customer_value'] {
    if (totalPremium > 50000 || policyCount >= 5) return 'premium';
    if (totalPremium > 20000 || policyCount >= 3) return 'high';
    if (totalPremium > 5000 || policyCount >= 2) return 'medium';
    return 'low';
  }

  private getChurnRisk(
    policies: Policy[],
    claims: Claim[]
  ): CustomerEnrichment['churn_risk'] {
    // High churn risk indicators
    const hasRejectedClaims = claims.some(c => c.status === 'rejected');
    const hasExpiringPolicies = policies.some(p => {
      const days = this.calculateDaysUntilExpiry(p.end_date);
      return days !== undefined && days <= 30;
    });

    if (hasRejectedClaims && hasExpiringPolicies) return 'high';
    if (hasRejectedClaims || hasExpiringPolicies) return 'medium';
    return 'low';
  }

  private getUpsellPotential(
    customer: Customer,
    policies: Policy[],
    age?: number
  ): CustomerEnrichment['upsell_potential'] {
    const coverageTypes = new Set(policies.map(p => p.insurance_type));

    // Count missing essential coverages
    const essentials = ['life', 'health', 'home', 'car'];
    const missingCount = essentials.filter(t => !coverageTypes.has(t as any)).length;

    // Young adults with missing coverage = high potential
    if (age && age < 40 && missingCount >= 2) return 'high';
    if (missingCount >= 2) return 'medium';
    if (missingCount >= 1) return 'low';
    return 'low';
  }

  private getNextBestActions(
    customer: Customer,
    policies: Policy[],
    pensionAccounts: PensionAccount[],
    claims: Claim[],
    age?: number
  ): string[] {
    const actions: string[] = [];
    const coverageTypes = new Set(policies.map(p => p.insurance_type));

    // Missing life insurance for family stage
    if (age && age > 25 && age < 60 && !coverageTypes.has('life')) {
      actions.push('recommend_life_insurance');
    }

    // Missing health insurance
    if (!coverageTypes.has('health')) {
      actions.push('recommend_health_insurance');
    }

    // High pension fees
    const highFeePension = pensionAccounts.find(p =>
      (p.management_fees?.savings_fee_percent || 0) > 0.5
    );
    if (highFeePension) {
      actions.push('review_pension_fees');
    }

    // Expiring policies
    const expiringPolicies = policies.filter(p => {
      const days = this.calculateDaysUntilExpiry(p.end_date);
      return days !== undefined && days <= 60;
    });
    if (expiringPolicies.length > 0) {
      actions.push('renew_expiring_policies');
    }

    // Pending claims follow-up
    const pendingClaims = claims.filter(c =>
      ['submitted', 'under_review'].includes(c.status)
    );
    if (pendingClaims.length > 0) {
      actions.push('follow_up_claims');
    }

    return actions.slice(0, 5); // Limit to top 5 actions
  }

  private calculateDaysUntilExpiry(endDate?: string): number | undefined {
    if (!endDate) return undefined;

    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateAnnualPremium(policy: Policy): number {
    const amount = policy.premium.amount;
    const frequency = policy.premium.frequency;

    switch (frequency) {
      case 'monthly':
        return amount * 12;
      case 'quarterly':
        return amount * 4;
      case 'semi_annual':
        return amount * 2;
      case 'annual':
        return amount;
      case 'one_time':
        return amount;
      default:
        return amount * 12;
    }
  }

  private calculateTotalAnnualPremium(policies: Policy[]): number {
    return policies
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + this.calculateAnnualPremium(p), 0);
  }

  private getPortfolioHealth(
    coverageCount: number,
    missingCount: number,
    concentrationRisk: number,
    pensionCount: number
  ): PortfolioEnrichment['overall_health'] {
    let score = 0;

    // Coverage diversity (0-40 points)
    score += Math.min(40, coverageCount * 10);

    // Missing coverage penalty (0-20 points)
    score += Math.max(0, 20 - missingCount * 10);

    // Concentration risk (0-20 points)
    score += Math.max(0, 20 - concentrationRisk * 20);

    // Pension planning (0-20 points)
    score += Math.min(20, pensionCount * 10);

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }
}

// Export singleton
export const dataEnricher = new DataEnricher();
