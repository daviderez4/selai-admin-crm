/**
 * SELAI Insurance Integration Hub
 * Coverage Analyzer - מנתח כיסויים ביטוחיים
 *
 * Advanced coverage analysis including:
 * - Portfolio analysis
 * - Gap detection with rules engine
 * - Coverage scoring
 * - Personalized recommendations
 * - Risk assessment
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { Policy, PensionAccount } from '../models/canonical.js';
import { EventBus, getEventBus } from './event-bus.js';

// ============================================
// TYPES
// ============================================

export interface CoverageGap {
  id: string;
  type: GapType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  title_hebrew: string;
  description: string;
  description_hebrew: string;
  insurance_type: string;
  recommended_coverage?: number;
  estimated_premium?: number;
  related_policy_id?: string;
  detection_rule: string;
  created_at: string;
}

export type GapType =
  | 'MISSING_LIFE_INSURANCE'
  | 'MISSING_HOME_INSURANCE'
  | 'MISSING_HEALTH_INSURANCE'
  | 'MISSING_DISABILITY_INSURANCE'
  | 'MISSING_LONG_TERM_CARE'
  | 'INSUFFICIENT_COVERAGE'
  | 'HIGH_MANAGEMENT_FEES'
  | 'MISSING_PENSION_COVERAGE'
  | 'MISSING_COMPREHENSIVE_VEHICLE'
  | 'EXPIRING_POLICY'
  | 'DUPLICATE_COVERAGE'
  | 'PREMIUM_OPTIMIZATION';

export interface CoverageScore {
  overall_score: number;        // 0-100
  category_scores: {
    life: number;
    health: number;
    property: number;
    retirement: number;
    liability: number;
  };
  recommendations_count: number;
  gaps_count: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  grade_description: string;
}

export interface PortfolioAnalysis {
  customer_id: string;
  analysis_date: string;
  policies_count: number;
  pension_accounts_count: number;
  total_coverage: {
    life: number;
    health: number;
    property: number;
    vehicle: number;
    pension_balance: number;
  };
  total_annual_premium: number;
  premium_breakdown: {
    life: number;
    health: number;
    property: number;
    vehicle: number;
    pension_contributions: number;
  };
  coverage_score: CoverageScore;
  gaps: CoverageGap[];
  recommendations: Recommendation[];
  risk_assessment: RiskAssessment;
}

export interface Recommendation {
  id: string;
  type: 'new_policy' | 'upgrade' | 'optimize' | 'review' | 'transfer';
  priority: 'high' | 'medium' | 'low';
  title: string;
  title_hebrew: string;
  description: string;
  description_hebrew: string;
  insurance_type?: string;
  potential_savings?: number;
  action_required: string;
  related_gap_id?: string;
}

export interface RiskAssessment {
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  protection_level: number; // 0-100
  vulnerability_areas: string[];
}

export interface CustomerProfile {
  id: string;
  id_number: string;
  age?: number;
  has_dependents?: boolean;
  owns_property?: boolean;
  owns_vehicle?: boolean;
  is_employed?: boolean;
  income_bracket?: 'low' | 'medium' | 'high' | 'very_high';
  marital_status?: string;
}

// ============================================
// GAP DETECTION RULES
// ============================================

interface GapRule {
  type: GapType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  title_hebrew: string;
  description: string;
  description_hebrew: string;
  insurance_type: string;
  condition: (
    profile: CustomerProfile,
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ) => boolean;
  recommended_coverage?: (profile: CustomerProfile) => number;
  estimated_premium?: (profile: CustomerProfile) => number;
}

const GAP_RULES: GapRule[] = [
  {
    type: 'MISSING_LIFE_INSURANCE',
    priority: 'high',
    title: 'No Life Insurance',
    title_hebrew: 'חסר ביטוח חיים',
    description: 'No standalone life insurance policy found. Life insurance provides financial protection for dependents.',
    description_hebrew: 'לא נמצאה פוליסת ביטוח חיים עצמאית. ביטוח חיים מספק הגנה כלכלית לתלויים.',
    insurance_type: 'life',
    condition: (profile, policies) => {
      const hasLifeInsurance = policies.some(
        p => p.insurance_type === 'life' && p.status === 'active'
      );
      return !hasLifeInsurance && (profile.has_dependents || (profile.age && profile.age > 25));
    },
    recommended_coverage: (profile) => {
      // Rule of thumb: 10x annual income
      const incomeMultiplier: Record<string, number> = {
        low: 150000,
        medium: 300000,
        high: 600000,
        very_high: 1200000
      };
      return incomeMultiplier[profile.income_bracket || 'medium'] || 500000;
    },
    estimated_premium: () => 200
  },
  {
    type: 'MISSING_HOME_INSURANCE',
    priority: 'medium',
    title: 'No Home Insurance',
    title_hebrew: 'חסר ביטוח דירה',
    description: 'No property insurance found for home owners. Protects against fire, theft, and natural disasters.',
    description_hebrew: 'לא נמצא ביטוח דירה לבעלי נכסים. מגן מפני אש, גניבה ואסונות טבע.',
    insurance_type: 'home',
    condition: (profile, policies) => {
      const hasHomeInsurance = policies.some(
        p => p.insurance_type === 'home' && p.status === 'active'
      );
      return !hasHomeInsurance && profile.owns_property === true;
    },
    recommended_coverage: () => 1500000,
    estimated_premium: () => 1500
  },
  {
    type: 'MISSING_HEALTH_INSURANCE',
    priority: 'high',
    title: 'No Private Health Insurance',
    title_hebrew: 'חסר ביטוח בריאות פרטי',
    description: 'No supplementary health insurance found. Provides access to private healthcare and shorter waiting times.',
    description_hebrew: 'לא נמצא ביטוח בריאות משלים. מספק גישה לרפואה פרטית וזמני המתנה קצרים.',
    insurance_type: 'health',
    condition: (profile, policies) => {
      const hasHealthInsurance = policies.some(
        p => p.insurance_type === 'health' && p.status === 'active'
      );
      return !hasHealthInsurance;
    },
    estimated_premium: () => 350
  },
  {
    type: 'MISSING_DISABILITY_INSURANCE',
    priority: 'high',
    title: 'No Disability Coverage',
    title_hebrew: 'חסר כיסוי אובדן כושר עבודה',
    description: 'No disability insurance in pension or standalone policy. Critical for income protection.',
    description_hebrew: 'לא נמצא ביטוח אובדן כושר עבודה בפנסיה או בפוליסה נפרדת. קריטי להגנה על הכנסה.',
    insurance_type: 'disability',
    condition: (profile, policies, pensionAccounts) => {
      // Check pension accounts for disability coverage
      const hasPensionDisability = pensionAccounts.some(
        pa => pa.status === 'active' &&
          pa.insurance_coverage?.disability?.coverage_amount &&
          pa.insurance_coverage.disability.coverage_amount > 0
      );

      // Check standalone disability policies
      const hasStandaloneDisability = policies.some(
        p => (p.insurance_type === 'disability' || p.insurance_type === 'accident') &&
          p.status === 'active'
      );

      return !hasPensionDisability && !hasStandaloneDisability && profile.is_employed === true;
    },
    estimated_premium: () => 150
  },
  {
    type: 'MISSING_LONG_TERM_CARE',
    priority: 'medium',
    title: 'No Long-Term Care Insurance',
    title_hebrew: 'חסר ביטוח סיעודי',
    description: 'No long-term care coverage found. Important for individuals over 50.',
    description_hebrew: 'לא נמצא ביטוח סיעודי. חשוב לאנשים מעל גיל 50.',
    insurance_type: 'long_term_care',
    condition: (profile, policies) => {
      const hasLTC = policies.some(
        p => p.insurance_type === 'long_term_care' && p.status === 'active'
      );
      return !hasLTC && profile.age !== undefined && profile.age >= 50;
    },
    estimated_premium: () => 400
  },
  {
    type: 'HIGH_MANAGEMENT_FEES',
    priority: 'medium',
    title: 'High Pension Management Fees',
    title_hebrew: 'דמי ניהול גבוהים בפנסיה',
    description: 'Pension management fees exceed 0.5% of savings. Consider negotiating or transferring.',
    description_hebrew: 'דמי הניהול בפנסיה עולים על 0.5% מהצבירה. כדאי לנהל משא ומתן או להעביר.',
    insurance_type: 'pension',
    condition: (_, __, pensionAccounts) => {
      return pensionAccounts.some(
        pa => pa.status === 'active' &&
          pa.management_fees?.savings_fee_percent !== undefined &&
          pa.management_fees.savings_fee_percent > 0.5
      );
    }
  },
  {
    type: 'MISSING_PENSION_COVERAGE',
    priority: 'high',
    title: 'Pension Missing Death Coverage',
    title_hebrew: 'פנסיה ללא כיסוי למקרה מוות',
    description: 'Active pension account without death coverage for beneficiaries.',
    description_hebrew: 'חשבון פנסיה פעיל ללא כיסוי מוות למוטבים.',
    insurance_type: 'pension',
    condition: (profile, _, pensionAccounts) => {
      return pensionAccounts.some(
        pa => pa.status === 'active' &&
          pa.account_type === 'pension_comprehensive' &&
          (!pa.insurance_coverage?.death?.coverage_amount ||
            pa.insurance_coverage.death.coverage_amount === 0)
      ) && profile.has_dependents === true;
    }
  },
  {
    type: 'MISSING_COMPREHENSIVE_VEHICLE',
    priority: 'low',
    title: 'Vehicle Without Comprehensive Coverage',
    title_hebrew: 'רכב ללא ביטוח מקיף',
    description: 'Vehicle policy without comprehensive coverage. Consider adding for newer vehicles.',
    description_hebrew: 'ביטוח רכב ללא כיסוי מקיף. כדאי להוסיף לרכבים חדשים יותר.',
    insurance_type: 'car',
    condition: (profile, policies) => {
      return policies.some(
        p => p.insurance_type === 'car' &&
          p.status === 'active' &&
          p.type_specific_data?.coverage_flags?.comprehensive !== true &&
          p.type_specific_data?.vehicle?.year &&
          new Date().getFullYear() - p.type_specific_data.vehicle.year <= 5
      ) && profile.owns_vehicle === true;
    }
  },
  {
    type: 'EXPIRING_POLICY',
    priority: 'high',
    title: 'Policy Expiring Soon',
    title_hebrew: 'פוליסה עומדת לפוג בקרוב',
    description: 'One or more policies will expire within 30 days. Take action to avoid coverage gaps.',
    description_hebrew: 'אחת או יותר מהפוליסות תפוג בתוך 30 יום. יש לפעול כדי למנוע פערי כיסוי.',
    insurance_type: 'general',
    condition: (_, policies) => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      return policies.some(
        p => p.status === 'active' &&
          new Date(p.end_date) <= thirtyDaysFromNow &&
          new Date(p.end_date) >= new Date()
      );
    }
  }
];

// ============================================
// COVERAGE ANALYZER SERVICE
// ============================================

export class CoverageAnalyzer {
  private static instance: CoverageAnalyzer;
  private eventBus?: EventBus;

  private constructor() {}

  static getInstance(): CoverageAnalyzer {
    if (!CoverageAnalyzer.instance) {
      CoverageAnalyzer.instance = new CoverageAnalyzer();
    }
    return CoverageAnalyzer.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.eventBus = getEventBus();
      logger.info('CoverageAnalyzer initialized');
    } catch (error) {
      logger.warn('CoverageAnalyzer: Event bus not available', { error });
    }
  }

  // ============================================
  // MAIN ANALYSIS
  // ============================================

  /**
   * Analyze customer's full insurance portfolio
   */
  async analyzePortfolio(
    customerId: string,
    profile: CustomerProfile,
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): Promise<PortfolioAnalysis> {
    const startTime = Date.now();

    logger.info('CoverageAnalyzer: Starting portfolio analysis', { customerId });

    // Calculate totals
    const totalCoverage = this.calculateTotalCoverage(policies, pensionAccounts);
    const premiumBreakdown = this.calculatePremiumBreakdown(policies, pensionAccounts);
    const totalAnnualPremium = Object.values(premiumBreakdown).reduce((a, b) => a + b, 0);

    // Detect gaps
    const gaps = this.detectGaps(profile, policies, pensionAccounts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(gaps, policies, pensionAccounts);

    // Calculate coverage score
    const coverageScore = this.calculateCoverageScore(
      profile,
      policies,
      pensionAccounts,
      gaps
    );

    // Assess risk
    const riskAssessment = this.assessRisk(profile, policies, pensionAccounts, gaps);

    const analysis: PortfolioAnalysis = {
      customer_id: customerId,
      analysis_date: new Date().toISOString(),
      policies_count: policies.filter(p => p.status === 'active').length,
      pension_accounts_count: pensionAccounts.filter(pa => pa.status === 'active').length,
      total_coverage: totalCoverage,
      total_annual_premium: totalAnnualPremium,
      premium_breakdown: premiumBreakdown,
      coverage_score: coverageScore,
      gaps,
      recommendations,
      risk_assessment: riskAssessment
    };

    // Publish event if gaps detected
    if (gaps.length > 0 && this.eventBus) {
      await this.eventBus.publish('selai.customers.gaps_detected', {
        customer_id: customerId,
        gaps_count: gaps.length,
        high_priority_gaps: gaps.filter(g => g.priority === 'high').length,
        coverage_score: coverageScore.overall_score
      });
    }

    const duration = Date.now() - startTime;
    logger.info('CoverageAnalyzer: Analysis complete', {
      customerId,
      duration,
      gapsFound: gaps.length,
      score: coverageScore.overall_score
    });

    return analysis;
  }

  // ============================================
  // GAP DETECTION
  // ============================================

  /**
   * Detect coverage gaps based on rules
   */
  detectGaps(
    profile: CustomerProfile,
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    for (const rule of GAP_RULES) {
      try {
        if (rule.condition(profile, policies, pensionAccounts)) {
          gaps.push({
            id: uuidv4(),
            type: rule.type,
            priority: rule.priority,
            title: rule.title,
            title_hebrew: rule.title_hebrew,
            description: rule.description,
            description_hebrew: rule.description_hebrew,
            insurance_type: rule.insurance_type,
            recommended_coverage: rule.recommended_coverage?.(profile),
            estimated_premium: rule.estimated_premium?.(profile),
            detection_rule: rule.type,
            created_at: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('CoverageAnalyzer: Rule evaluation failed', {
          rule: rule.type,
          error
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return gaps;
  }

  // ============================================
  // COVERAGE SCORING
  // ============================================

  /**
   * Calculate coverage score
   */
  calculateCoverageScore(
    profile: CustomerProfile,
    policies: Policy[],
    pensionAccounts: PensionAccount[],
    gaps: CoverageGap[]
  ): CoverageScore {
    // Base scores by category
    const categoryScores = {
      life: this.scoreCategoryLife(policies, pensionAccounts),
      health: this.scoreCategoryHealth(policies),
      property: this.scoreCategoryProperty(profile, policies),
      retirement: this.scoreCategoryRetirement(pensionAccounts),
      liability: this.scoreCategoryLiability(policies)
    };

    // Calculate overall score (weighted average)
    const weights = { life: 0.25, health: 0.2, property: 0.15, retirement: 0.3, liability: 0.1 };
    let overallScore = 0;
    for (const [category, score] of Object.entries(categoryScores)) {
      overallScore += score * weights[category as keyof typeof weights];
    }

    // Deduct points for gaps
    const gapPenalty = gaps.reduce((penalty, gap) => {
      const penaltyMap = { high: 10, medium: 5, low: 2 };
      return penalty + penaltyMap[gap.priority];
    }, 0);

    overallScore = Math.max(0, overallScore - gapPenalty);

    // Determine grade
    const grade = this.scoreToGrade(overallScore);

    return {
      overall_score: Math.round(overallScore),
      category_scores: categoryScores,
      recommendations_count: gaps.length,
      gaps_count: gaps.length,
      grade: grade.letter,
      grade_description: grade.description
    };
  }

  private scoreCategoryLife(policies: Policy[], pensionAccounts: PensionAccount[]): number {
    let score = 0;

    // Check for life insurance
    const hasLifePolicy = policies.some(
      p => p.insurance_type === 'life' && p.status === 'active'
    );
    if (hasLifePolicy) score += 50;

    // Check pension death coverage
    const hasPensionDeathCoverage = pensionAccounts.some(
      pa => pa.status === 'active' &&
        pa.insurance_coverage?.death?.coverage_amount &&
        pa.insurance_coverage.death.coverage_amount > 0
    );
    if (hasPensionDeathCoverage) score += 30;

    // Check for disability coverage
    const hasDisability = pensionAccounts.some(
      pa => pa.status === 'active' &&
        pa.insurance_coverage?.disability?.coverage_amount &&
        pa.insurance_coverage.disability.coverage_amount > 0
    );
    if (hasDisability) score += 20;

    return Math.min(100, score);
  }

  private scoreCategoryHealth(policies: Policy[]): number {
    let score = 0;

    const hasHealth = policies.some(
      p => p.insurance_type === 'health' && p.status === 'active'
    );
    if (hasHealth) score += 70;

    const hasAccident = policies.some(
      p => p.insurance_type === 'accident' && p.status === 'active'
    );
    if (hasAccident) score += 30;

    return Math.min(100, score);
  }

  private scoreCategoryProperty(profile: CustomerProfile, policies: Policy[]): number {
    let score = 50; // Base score

    if (profile.owns_property) {
      const hasHome = policies.some(
        p => p.insurance_type === 'home' && p.status === 'active'
      );
      if (hasHome) score += 50;
      else score -= 30;
    }

    if (profile.owns_vehicle) {
      const hasVehicle = policies.some(
        p => p.insurance_type === 'car' && p.status === 'active'
      );
      if (hasVehicle) score += 30;
      else score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreCategoryRetirement(pensionAccounts: PensionAccount[]): number {
    let score = 0;

    const activeAccounts = pensionAccounts.filter(pa => pa.status === 'active');

    if (activeAccounts.length > 0) {
      score += 40;

      // Check for reasonable fees
      const hasGoodFees = activeAccounts.some(
        pa => pa.management_fees?.savings_fee_percent !== undefined &&
          pa.management_fees.savings_fee_percent <= 0.5
      );
      if (hasGoodFees) score += 20;

      // Check for regular contributions
      const hasContributions = activeAccounts.some(
        pa => pa.contributions?.monthly_salary &&
          pa.contributions.monthly_salary > 0
      );
      if (hasContributions) score += 20;

      // Check balance
      const totalBalance = activeAccounts.reduce(
        (sum, pa) => sum + pa.balance.total, 0
      );
      if (totalBalance > 100000) score += 20;
    }

    return Math.min(100, score);
  }

  private scoreCategoryLiability(policies: Policy[]): number {
    let score = 50; // Base

    const hasLiability = policies.some(
      p => p.insurance_type === 'liability' && p.status === 'active'
    );
    if (hasLiability) score += 50;

    return Math.min(100, score);
  }

  private scoreToGrade(score: number): { letter: 'A' | 'B' | 'C' | 'D' | 'F'; description: string } {
    if (score >= 90) return { letter: 'A', description: 'Excellent coverage - well protected' };
    if (score >= 80) return { letter: 'B', description: 'Good coverage - minor gaps exist' };
    if (score >= 70) return { letter: 'C', description: 'Average coverage - review recommended' };
    if (score >= 60) return { letter: 'D', description: 'Below average - action needed' };
    return { letter: 'F', description: 'Poor coverage - immediate attention required' };
  }

  // ============================================
  // RECOMMENDATIONS
  // ============================================

  /**
   * Generate recommendations based on gaps
   */
  generateRecommendations(
    gaps: CoverageGap[],
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Convert gaps to recommendations
    for (const gap of gaps) {
      recommendations.push({
        id: uuidv4(),
        type: 'new_policy',
        priority: gap.priority,
        title: `Add ${gap.title}`,
        title_hebrew: `הוסף ${gap.title_hebrew}`,
        description: gap.description,
        description_hebrew: gap.description_hebrew,
        insurance_type: gap.insurance_type,
        action_required: `Consider purchasing ${gap.insurance_type} insurance`,
        related_gap_id: gap.id
      });
    }

    // Add optimization recommendations
    const highFeeAccounts = pensionAccounts.filter(
      pa => pa.status === 'active' &&
        pa.management_fees?.savings_fee_percent !== undefined &&
        pa.management_fees.savings_fee_percent > 0.5
    );

    for (const account of highFeeAccounts) {
      const potentialSavings = account.balance.total *
        ((account.management_fees!.savings_fee_percent! - 0.3) / 100);

      recommendations.push({
        id: uuidv4(),
        type: 'optimize',
        priority: 'medium',
        title: 'Reduce pension management fees',
        title_hebrew: 'הפחת דמי ניהול בפנסיה',
        description: `Account ${account.account_number} has fees of ${account.management_fees?.savings_fee_percent}%`,
        description_hebrew: `חשבון ${account.account_number} עם דמי ניהול של ${account.management_fees?.savings_fee_percent}%`,
        insurance_type: 'pension',
        potential_savings: Math.round(potentialSavings),
        action_required: 'Negotiate lower fees or consider transfer'
      });
    }

    return recommendations;
  }

  // ============================================
  // RISK ASSESSMENT
  // ============================================

  /**
   * Assess overall risk level
   */
  assessRisk(
    profile: CustomerProfile,
    policies: Policy[],
    pensionAccounts: PensionAccount[],
    gaps: CoverageGap[]
  ): RiskAssessment {
    const riskFactors: RiskAssessment['risk_factors'] = [];
    const vulnerabilityAreas: string[] = [];

    // High priority gaps indicate risk
    const highPriorityGaps = gaps.filter(g => g.priority === 'high');
    if (highPriorityGaps.length > 0) {
      riskFactors.push({
        factor: 'Critical coverage gaps',
        impact: 'high',
        description: `${highPriorityGaps.length} high priority insurance gaps detected`
      });
      vulnerabilityAreas.push(...highPriorityGaps.map(g => g.insurance_type));
    }

    // Expiring policies
    const expiringPolicies = policies.filter(p => {
      const daysUntilExpiry = Math.ceil(
        (new Date(p.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return p.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    });

    if (expiringPolicies.length > 0) {
      riskFactors.push({
        factor: 'Expiring policies',
        impact: 'medium',
        description: `${expiringPolicies.length} policies expiring within 30 days`
      });
    }

    // No retirement savings
    const activeRetirement = pensionAccounts.filter(pa => pa.status === 'active');
    if (activeRetirement.length === 0 && profile.is_employed) {
      riskFactors.push({
        factor: 'No retirement savings',
        impact: 'high',
        description: 'No active pension or provident fund accounts'
      });
      vulnerabilityAreas.push('retirement');
    }

    // Calculate protection level
    let protectionLevel = 100;
    for (const gap of gaps) {
      const penalty = { high: 20, medium: 10, low: 5 }[gap.priority];
      protectionLevel -= penalty;
    }
    protectionLevel = Math.max(0, protectionLevel);

    // Determine overall risk level
    let overallRiskLevel: RiskAssessment['overall_risk_level'] = 'low';
    if (highPriorityGaps.length >= 3 || protectionLevel < 40) {
      overallRiskLevel = 'critical';
    } else if (highPriorityGaps.length >= 2 || protectionLevel < 60) {
      overallRiskLevel = 'high';
    } else if (highPriorityGaps.length >= 1 || protectionLevel < 80) {
      overallRiskLevel = 'medium';
    }

    return {
      overall_risk_level: overallRiskLevel,
      risk_factors: riskFactors,
      protection_level: protectionLevel,
      vulnerability_areas: [...new Set(vulnerabilityAreas)]
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private calculateTotalCoverage(
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): PortfolioAnalysis['total_coverage'] {
    const activePolicies = policies.filter(p => p.status === 'active');
    const activeAccounts = pensionAccounts.filter(pa => pa.status === 'active');

    return {
      life: activePolicies
        .filter(p => p.insurance_type === 'life')
        .reduce((sum, p) => sum + (p.coverage?.primary_coverage || 0), 0),
      health: activePolicies
        .filter(p => p.insurance_type === 'health')
        .reduce((sum, p) => sum + (p.coverage?.primary_coverage || 0), 0),
      property: activePolicies
        .filter(p => p.insurance_type === 'home')
        .reduce((sum, p) => sum + (p.coverage?.primary_coverage || 0), 0),
      vehicle: activePolicies
        .filter(p => p.insurance_type === 'car')
        .reduce((sum, p) => sum + (p.coverage?.primary_coverage || 0), 0),
      pension_balance: activeAccounts.reduce((sum, pa) => sum + pa.balance.total, 0)
    };
  }

  private calculatePremiumBreakdown(
    policies: Policy[],
    pensionAccounts: PensionAccount[]
  ): PortfolioAnalysis['premium_breakdown'] {
    const activePolicies = policies.filter(p => p.status === 'active');
    const activeAccounts = pensionAccounts.filter(pa => pa.status === 'active');

    const annualizePremium = (p: Policy): number => {
      const amount = p.premium.amount;
      switch (p.premium.frequency) {
        case 'monthly': return amount * 12;
        case 'quarterly': return amount * 4;
        case 'semi_annual': return amount * 2;
        default: return amount;
      }
    };

    return {
      life: activePolicies
        .filter(p => p.insurance_type === 'life')
        .reduce((sum, p) => sum + annualizePremium(p), 0),
      health: activePolicies
        .filter(p => p.insurance_type === 'health')
        .reduce((sum, p) => sum + annualizePremium(p), 0),
      property: activePolicies
        .filter(p => p.insurance_type === 'home')
        .reduce((sum, p) => sum + annualizePremium(p), 0),
      vehicle: activePolicies
        .filter(p => p.insurance_type === 'car')
        .reduce((sum, p) => sum + annualizePremium(p), 0),
      pension_contributions: activeAccounts.reduce((sum, pa) => {
        const monthly = pa.contributions?.monthly_salary || 0;
        const rate = (pa.contributions?.employee_rate || 0) +
          (pa.contributions?.employer_rate || 0);
        return sum + (monthly * rate / 100 * 12);
      }, 0)
    };
  }
}

// ============================================
// SINGLETON ACCESSOR
// ============================================

let _coverageAnalyzer: CoverageAnalyzer | null = null;

export function getCoverageAnalyzer(): CoverageAnalyzer {
  if (!_coverageAnalyzer) {
    _coverageAnalyzer = CoverageAnalyzer.getInstance();
  }
  return _coverageAnalyzer;
}
