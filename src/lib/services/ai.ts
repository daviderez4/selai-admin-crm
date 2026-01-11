/**
 * AI Integration Service
 *
 * Uses OpenAI for intelligent CRM features:
 * - Coverage gap analysis
 * - Customer scoring
 * - Churn prediction
 * - Message generation
 * - Intent analysis
 */

import type {
  GapAnalysisInput,
  GapAnalysisResult,
  ChurnPrediction,
  ScoreCalculation,
  MessageAnalysis,
  CoverageGapInsert,
  InsuranceCategory,
  Priority,
} from '@/types/crm';

interface AIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface MessageGenerationParams {
  contactName: string;
  context: string;
  tone?: 'formal' | 'friendly' | 'professional';
  language?: 'hebrew' | 'english';
}

interface IntentAnalysisResult {
  intent: 'inquiry' | 'complaint' | 'renewal' | 'claim' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  topic?: string;
  suggestedActions: string[];
}

class AIService {
  private config: AIConfig | null = null;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model: string = 'gpt-4o';

  /**
   * Initialize the AI service with OpenAI credentials
   */
  init(config: AIConfig): void {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.model) {
      this.model = config.model;
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Make API request to OpenAI
   */
  private async chat(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.config) {
      throw new Error('AI service not configured. Call init() first.');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Parse JSON from AI response
   */
  private parseJSON<T>(response: string): T {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
      response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr) as T;
  }

  /**
   * Analyze insurance coverage gaps for a contact
   */
  async analyzeGaps(input: GapAnalysisInput): Promise<GapAnalysisResult> {
    const systemPrompt = `אתה יועץ ביטוח מומחה בישראל. נתח את המידע על הלקוח וזהה פערי כיסוי ביטוחי.

החזר JSON בפורמט הבא:
{
  "gaps": [
    {
      "gap_type": "missing_policy" | "under_coverage" | "bundle_opportunity",
      "category": "car" | "home" | "life" | "health" | "savings" | "business",
      "title": "כותרת קצרה בעברית",
      "description": "תיאור הפער והסיכון",
      "priority": "low" | "medium" | "high" | "critical",
      "recommended_product": "סוג הביטוח המומלץ",
      "recommended_company": "חברת ביטוח מומלצת (אופציונלי)",
      "estimated_premium": 0, // פרמיה חודשית משוערת בש"ח
      "estimated_commission": 0, // עמלה משוערת בש"ח
      "talking_points": ["נקודות לשיחה עם הלקוח"],
      "ai_confidence": 0.85 // רמת ביטחון 0-1
    }
  ]
}

התמקד ב:
- ביטוח חובה לפי חוק (רכב, דירה למשכנתא)
- פערים ברמת כיסוי קיימת
- הזדמנויות לחבילות ביטוח
- ביטוחים מומלצים לפי מצב משפחתי ועיסוק`;

    const userPrompt = `נתוני הלקוח:
שם: ${input.contact.name}
גיל: ${input.contact.age}
מצב משפחתי: ${input.contact.marital_status}
עיסוק: ${input.contact.occupation}
רמת הכנסה: ${input.contact.income_bracket}

בני משפחה:
${input.contact.family.map((f) => `- ${f.relationship}${f.age ? ` (גיל ${f.age})` : ''}`).join('\n')}

נכסים:
${input.contact.assets.map((a) => `- ${a.type}${a.value ? ` (שווי: ${a.value.toLocaleString()} ₪)` : ''}`).join('\n')}

פוליסות קיימות:
${input.policies.length > 0
  ? input.policies.map((p) =>
      `- ${p.type} (${p.category})${p.coverage_amount ? `, כיסוי: ${p.coverage_amount.toLocaleString()} ₪` : ''}${p.premium_monthly ? `, פרמיה: ${p.premium_monthly.toLocaleString()} ₪/חודש` : ''}`
    ).join('\n')
  : 'אין פוליסות קיימות'}

זהה את פערי הכיסוי והמלצות לביטוחים נוספים.`;

    const response = await this.chat(systemPrompt, userPrompt);
    const result = this.parseJSON<{ gaps: CoverageGapInsert[] }>(response);

    return {
      gaps: result.gaps.map((gap) => ({
        ...gap,
        contact_id: '', // Will be set by the caller
      })),
    };
  }

  /**
   * Calculate customer scores
   */
  async calculateScores(input: {
    contact: {
      name: string;
      policies_count: number;
      total_premium: number;
      years_as_customer: number;
      claims_count: number;
      last_contact_days: number;
      messages_count: number;
      meetings_count: number;
      renewal_rate: number;
    };
  }): Promise<ScoreCalculation> {
    const systemPrompt = `אתה מערכת דירוג לקוחות לסוכנות ביטוח.

חשב ציונים בסקאלה 0-100 עבור:
- engagement_score: רמת המעורבות והאינטראקציה
- satisfaction_score: שביעות רצון משוערת
- churn_risk_score: סיכון נטישה (גבוה = רע)
- growth_potential_score: פוטנציאל צמיחה
- lifetime_value: ערך לקוח לאורך זמן (בש"ח)

החזר JSON:
{
  "engagement_score": 0,
  "satisfaction_score": 0,
  "churn_risk_score": 0,
  "growth_potential_score": 0,
  "lifetime_value": 0,
  "factors": ["גורם 1", "גורם 2"]
}`;

    const userPrompt = `נתוני הלקוח ${input.contact.name}:
- מספר פוליסות: ${input.contact.policies_count}
- סה"כ פרמיה חודשית: ${input.contact.total_premium.toLocaleString()} ₪
- שנים כלקוח: ${input.contact.years_as_customer}
- מספר תביעות: ${input.contact.claims_count}
- ימים מאז קשר אחרון: ${input.contact.last_contact_days}
- מספר הודעות: ${input.contact.messages_count}
- מספר פגישות: ${input.contact.meetings_count}
- שיעור חידושים: ${input.contact.renewal_rate}%

חשב את הציונים.`;

    const response = await this.chat(systemPrompt, userPrompt);
    return this.parseJSON<ScoreCalculation>(response);
  }

  /**
   * Predict churn risk
   */
  async predictChurn(input: {
    contact: {
      last_contact_days: number;
      policies_count: number;
      recent_claims: number;
      payment_issues: boolean;
      satisfaction_score?: number;
      competitor_mentions: boolean;
    };
  }): Promise<ChurnPrediction> {
    const systemPrompt = `אתה מערכת חיזוי נטישת לקוחות לסוכנות ביטוח.

נתח את הסימנים וחזה סיכון נטישה.

החזר JSON:
{
  "risk_score": 0, // 0-100
  "risk_level": "low" | "medium" | "high",
  "factors": ["גורם סיכון 1", "גורם סיכון 2"]
}`;

    const userPrompt = `מאפייני הלקוח:
- ימים מאז קשר אחרון: ${input.contact.last_contact_days}
- מספר פוליסות: ${input.contact.policies_count}
- תביעות לאחרונה: ${input.contact.recent_claims}
- בעיות תשלום: ${input.contact.payment_issues ? 'כן' : 'לא'}
- ציון שביעות רצון: ${input.contact.satisfaction_score ?? 'לא ידוע'}
- הזכרת מתחרים: ${input.contact.competitor_mentions ? 'כן' : 'לא'}

חזה את סיכון הנטישה.`;

    const response = await this.chat(systemPrompt, userPrompt);
    return this.parseJSON<ChurnPrediction>(response);
  }

  /**
   * Analyze message intent and sentiment
   */
  async analyzeMessage(message: string): Promise<IntentAnalysisResult> {
    const systemPrompt = `אתה מנתח הודעות לסוכנות ביטוח.

נתח את ההודעה וזהה:
- כוונה (inquiry, complaint, renewal, claim, general)
- סנטימנט (positive, neutral, negative)
- דחיפות (low, medium, high)
- נושא
- פעולות מומלצות

החזר JSON:
{
  "intent": "inquiry",
  "sentiment": "neutral",
  "urgency": "medium",
  "topic": "נושא ההודעה",
  "suggestedActions": ["פעולה 1", "פעולה 2"]
}`;

    const response = await this.chat(systemPrompt, message);
    return this.parseJSON<IntentAnalysisResult>(response);
  }

  /**
   * Generate a personalized message
   */
  async generateMessage(params: MessageGenerationParams): Promise<string> {
    const toneInstructions = {
      formal: 'שמור על טון רשמי ומכבד',
      friendly: 'השתמש בטון ידידותי וחם',
      professional: 'שלב טון מקצועי עם נגיעה אישית',
    };

    const systemPrompt = `אתה עוזר כתיבה לסוכן ביטוח.

כתוב הודעה ${params.language === 'hebrew' ? 'בעברית' : 'באנגלית'}.
${toneInstructions[params.tone || 'professional']}

ההודעה צריכה להיות:
- קצרה ולעניין
- אישית ומותאמת ללקוח
- כוללת קריאה לפעולה ברורה`;

    const userPrompt = `כתוב הודעה עבור ${params.contactName}.
קונטקסט: ${params.context}`;

    return this.chat(systemPrompt, userPrompt);
  }

  /**
   * Get product recommendations based on profile
   */
  async getRecommendations(input: {
    age: number;
    marital_status: string;
    occupation: string;
    income_bracket: string;
    existing_products: string[];
  }): Promise<{
    recommendations: Array<{
      product: string;
      category: InsuranceCategory;
      priority: Priority;
      reason: string;
    }>;
  }> {
    const systemPrompt = `אתה יועץ ביטוח מומחה.

בהינתן פרופיל לקוח, המלץ על מוצרי ביטוח רלוונטיים.

החזר JSON:
{
  "recommendations": [
    {
      "product": "שם המוצר",
      "category": "car" | "home" | "life" | "health" | "savings" | "business",
      "priority": "low" | "medium" | "high" | "critical",
      "reason": "סיבה להמלצה"
    }
  ]
}`;

    const userPrompt = `פרופיל לקוח:
- גיל: ${input.age}
- מצב משפחתי: ${input.marital_status}
- עיסוק: ${input.occupation}
- רמת הכנסה: ${input.income_bracket}
- מוצרים קיימים: ${input.existing_products.join(', ') || 'אין'}

המלץ על מוצרים מתאימים.`;

    const response = await this.chat(systemPrompt, userPrompt);
    return this.parseJSON<{
      recommendations: Array<{
        product: string;
        category: InsuranceCategory;
        priority: Priority;
        reason: string;
      }>;
    }>(response);
  }
}

// Singleton instance
export const aiService = new AIService();

// Export types
export type {
  AIConfig,
  MessageGenerationParams,
  IntentAnalysisResult,
};
