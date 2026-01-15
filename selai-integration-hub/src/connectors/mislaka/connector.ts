/**
 * SELAI Insurance Integration Hub
 * המסלקה הפנסיונית Connector - נתונים פנסיוניים
 * 
 * מספק גישה למידע פנסיוני:
 * - יתרות בגמל ופנסיה
 * - קרנות השתלמות
 * - תנועות בחשבון
 * - דמי ניהול
 * - כיסויים ביטוחיים
 * - פרודוקציות ותיקי מידע
 */

import axios, { AxiosInstance } from 'axios';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as soap from 'soap';
import SftpClient from 'ssh2-sftp-client';
import { v4 as uuidv4 } from 'uuid';
import {
  PensionAccount,
  PensionAccountSchema,
  Customer,
  Consent,
  ConsentSchema
} from '../../models/canonical.js';
import { logger } from '../../utils/logger.js';

// ============================================
// TYPES - הגדרות טיפוסים
// ============================================

export interface MislakaConfig {
  apiUrl: string;
  wsdlUrl?: string;
  clientId: string;
  clientSecret: string;
  certificatePath?: string;
  certificatePassword?: string;
  sftpHost?: string;
  sftpUser?: string;
  sftpPassword?: string;
  sftpPath?: string;
  timeout?: number;
}

export interface MislakaAuthResponse {
  token: string;
  expires_in: number;
}

export interface MislakaPensionData {
  account_number: string;
  fund_name: string;
  fund_number: string;
  managing_company: string;
  managing_company_code: string;
  account_type: string;
  status: string;
  balance: {
    total: number;
    severance: number;
    employer: number;
    employee: number;
    returns: number;
    as_of_date: string;
  };
  contributions: {
    monthly_salary?: number;
    employee_rate?: number;
    employer_rate?: number;
    severance_rate?: number;
    last_contribution_date?: string;
  };
  fees: {
    savings_fee: number;
    contributions_fee: number;
  };
  insurance?: {
    disability_coverage?: number;
    death_coverage?: number;
  };
}

export interface MislakaMovement {
  date: string;
  type: string;
  description: string;
  amount: number;
  balance_after: number;
  reference?: string;
}

export interface MislakaJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface MislakaConsentRequest {
  customer_id: string;
  scope: 'all' | 'pension' | 'provident' | 'severance';
  valid_until: string;
}

// ============================================
// MISLAKA CONNECTOR
// ============================================

export class MislakaConnector {
  private config: MislakaConfig;
  private httpClient: AxiosInstance;
  private soapClient?: soap.Client;
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: MislakaConfig) {
    this.config = config;
    
    // HTTP client for REST endpoints
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // XML parser/builder for SOAP
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });

    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * אתחול SOAP client
   */
  async initSoapClient(): Promise<void> {
    if (!this.config.wsdlUrl) {
      logger.warn('Mislaka: WSDL URL not configured, SOAP methods unavailable');
      return;
    }

    try {
      this.soapClient = await soap.createClientAsync(this.config.wsdlUrl, {
        wsdl_options: {
          timeout: this.config.timeout || 60000
        }
      });
      logger.info('Mislaka: SOAP client initialized');
    } catch (error) {
      logger.error('Mislaka: Failed to initialize SOAP client', { error });
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * אימות מול המסלקה
   */
  async authenticate(): Promise<string> {
    try {
      const response = await this.httpClient.post<MislakaAuthResponse>(
        '/auth/token',
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      logger.info('Mislaka: Authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('Mislaka: Authentication failed', { error });
      throw new Error('Failed to authenticate with Mislaka API');
    }
  }

  /**
   * קבלת טוקן תקף
   */
  private async getValidToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      return this.authenticate();
    }
    return this.accessToken;
  }

  /**
   * הוספת Authorization headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.httpClient.get('/health', { headers });
      return response.status === 200;
    } catch (error) {
      logger.error('Mislaka: Health check failed', { error });
      return false;
    }
  }

  // ============================================
  // CONSENT - הסכמות
  // ============================================

  /**
   * יצירת הסכמה לגישה לנתונים
   */
  async createConsent(request: MislakaConsentRequest): Promise<Consent> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.post<{
        consent_id: string;
        status: string;
        document_url?: string;
      }>(
        '/v1/consents',
        {
          customer_id_number: request.customer_id,
          scope: request.scope,
          valid_until: request.valid_until
        },
        { headers }
      );

      const consent: Consent = {
        id: uuidv4(),
        customer_id: request.customer_id, // Should be mapped to UUID
        consent_type: 'mislaka_access',
        scope: request.scope,
        description: `גישה לנתוני מסלקה - ${request.scope}`,
        granted_at: new Date().toISOString(),
        expires_at: request.valid_until,
        status: 'active',
        document_id: response.data.document_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return ConsentSchema.parse(consent);
    } catch (error) {
      logger.error('Mislaka: Create consent failed', { error, request });
      throw error;
    }
  }

  /**
   * בדיקת הסכמה קיימת
   */
  async checkConsent(customerId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.get(
        `/v1/consents/${customerId}/status`,
        { headers }
      );

      return response.data.has_valid_consent === true;
    } catch (error) {
      logger.error('Mislaka: Check consent failed', { error, customerId });
      return false;
    }
  }

  // ============================================
  // PENSION DATA - נתוני פנסיה
  // ============================================

  /**
   * קבלת כל החשבונות הפנסיוניים של לקוח
   */
  async getPensionAccounts(customerId: string): Promise<PensionAccount[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.get<{ accounts: MislakaPensionData[] }>(
        `/v1/customers/${customerId}/accounts`,
        { headers }
      );

      return (response.data.accounts || []).map(account => 
        this.mapToPensionAccount(account, customerId)
      );
    } catch (error) {
      logger.error('Mislaka: Get pension accounts failed', { error, customerId });
      throw error;
    }
  }

  /**
   * קבלת חשבון ספציפי
   */
  async getPensionAccount(accountNumber: string): Promise<PensionAccount | null> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.get<MislakaPensionData>(
        `/v1/accounts/${accountNumber}`,
        { headers }
      );

      return this.mapToPensionAccount(response.data, '');
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('Mislaka: Get pension account failed', { error, accountNumber });
      throw error;
    }
  }

  /**
   * קבלת תנועות בחשבון
   */
  async getAccountMovements(
    accountNumber: string,
    fromDate?: string,
    toDate?: string
  ): Promise<MislakaMovement[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const params: Record<string, string> = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await this.httpClient.get<{ movements: MislakaMovement[] }>(
        `/v1/accounts/${accountNumber}/movements`,
        { headers, params }
      );

      return response.data.movements || [];
    } catch (error) {
      logger.error('Mislaka: Get account movements failed', { error, accountNumber });
      throw error;
    }
  }

  /**
   * קבלת דמי ניהול
   */
  async getManagementFees(accountNumber: string): Promise<{
    savings_fee: number;
    contributions_fee: number;
  } | null> {
    try {
      const account = await this.getPensionAccount(accountNumber);
      if (!account || !account.management_fees) {
        return null;
      }
      
      return {
        savings_fee: account.management_fees.savings_fee_percent || 0,
        contributions_fee: account.management_fees.contributions_fee_percent || 0
      };
    } catch (error) {
      logger.error('Mislaka: Get management fees failed', { error, accountNumber });
      return null;
    }
  }

  // ============================================
  // ASYNC JOBS - עבודות אסינכרוניות
  // ============================================

  /**
   * יצירת בקשה אסינכרונית לנתונים
   */
  async createDataRequest(customerId: string, requestType: string): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.post<{ job_id: string }>(
        '/v1/jobs',
        {
          customer_id: customerId,
          request_type: requestType
        },
        { headers }
      );

      logger.info('Mislaka: Data request created', { 
        customerId, 
        jobId: response.data.job_id 
      });
      
      return response.data.job_id;
    } catch (error) {
      logger.error('Mislaka: Create data request failed', { error, customerId });
      throw error;
    }
  }

  /**
   * בדיקת סטטוס עבודה
   */
  async getJobStatus(jobId: string): Promise<MislakaJobResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.get<MislakaJobResponse>(
        `/v1/jobs/${jobId}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error('Mislaka: Get job status failed', { error, jobId });
      throw error;
    }
  }

  /**
   * המתנה לסיום עבודה עם polling
   */
  async waitForJob(
    jobId: string, 
    maxWaitMs: number = 300000, 
    pollIntervalMs: number = 5000
  ): Promise<MislakaJobResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getJobStatus(jobId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Job ${jobId} timed out after ${maxWaitMs}ms`);
  }

  /**
   * הורדת תוצאות עבודה
   */
  async downloadJobResult<T>(resultUrl: string): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.httpClient.get<T>(resultUrl, { headers });
      return response.data;
    } catch (error) {
      logger.error('Mislaka: Download job result failed', { error, resultUrl });
      throw error;
    }
  }

  // ============================================
  // SFTP FALLBACK - גיבוי SFTP
  // ============================================

  /**
   * הורדת קבצים מ-SFTP (fallback)
   */
  async downloadFromSftp(remotePath: string): Promise<Buffer> {
    if (!this.config.sftpHost || !this.config.sftpUser) {
      throw new Error('SFTP not configured');
    }

    const sftp = new SftpClient();
    
    try {
      await sftp.connect({
        host: this.config.sftpHost,
        username: this.config.sftpUser,
        password: this.config.sftpPassword
      });

      const data = await sftp.get(remotePath);
      return data as Buffer;
    } finally {
      await sftp.end();
    }
  }

  /**
   * רשימת קבצים ב-SFTP
   */
  async listSftpFiles(remotePath?: string): Promise<string[]> {
    if (!this.config.sftpHost || !this.config.sftpUser) {
      throw new Error('SFTP not configured');
    }

    const sftp = new SftpClient();
    
    try {
      await sftp.connect({
        host: this.config.sftpHost,
        username: this.config.sftpUser,
        password: this.config.sftpPassword
      });

      const files = await sftp.list(remotePath || this.config.sftpPath || '/');
      return files.map(f => f.name);
    } finally {
      await sftp.end();
    }
  }

  // ============================================
  // SOAP METHODS - מתודות SOAP
  // ============================================

  /**
   * קריאת SOAP לקבלת נתונים
   */
  async soapGetPensionData(customerId: string): Promise<MislakaPensionData[]> {
    if (!this.soapClient) {
      throw new Error('SOAP client not initialized');
    }

    try {
      const [result] = await this.soapClient.GetPensionDataAsync({
        CustomerIdNumber: customerId,
        RequestType: 'FULL'
      });

      // Parse XML response
      const parsed = this.xmlParser.parse(result);
      return this.parseSoapPensionResponse(parsed);
    } catch (error) {
      logger.error('Mislaka: SOAP get pension data failed', { error, customerId });
      throw error;
    }
  }

  /**
   * פרסור תשובת SOAP
   */
  private parseSoapPensionResponse(xmlData: any): MislakaPensionData[] {
    // Extract accounts from SOAP response structure
    const accounts = xmlData?.Envelope?.Body?.GetPensionDataResponse?.Accounts?.Account;
    if (!accounts) return [];

    const accountList = Array.isArray(accounts) ? accounts : [accounts];
    
    return accountList.map((acc: any) => ({
      account_number: acc.AccountNumber,
      fund_name: acc.FundName,
      fund_number: acc.FundNumber,
      managing_company: acc.ManagingCompany,
      managing_company_code: acc.ManagingCompanyCode,
      account_type: acc.AccountType,
      status: acc.Status,
      balance: {
        total: parseFloat(acc.Balance?.Total || '0'),
        severance: parseFloat(acc.Balance?.Severance || '0'),
        employer: parseFloat(acc.Balance?.Employer || '0'),
        employee: parseFloat(acc.Balance?.Employee || '0'),
        returns: parseFloat(acc.Balance?.Returns || '0'),
        as_of_date: acc.Balance?.AsOfDate
      },
      contributions: {
        monthly_salary: acc.Contributions?.MonthlySalary ? parseFloat(acc.Contributions.MonthlySalary) : undefined,
        employee_rate: acc.Contributions?.EmployeeRate ? parseFloat(acc.Contributions.EmployeeRate) : undefined,
        employer_rate: acc.Contributions?.EmployerRate ? parseFloat(acc.Contributions.EmployerRate) : undefined,
        severance_rate: acc.Contributions?.SeveranceRate ? parseFloat(acc.Contributions.SeveranceRate) : undefined,
        last_contribution_date: acc.Contributions?.LastDate
      },
      fees: {
        savings_fee: parseFloat(acc.Fees?.SavingsFee || '0'),
        contributions_fee: parseFloat(acc.Fees?.ContributionsFee || '0')
      },
      insurance: {
        disability_coverage: acc.Insurance?.DisabilityCoverage ? parseFloat(acc.Insurance.DisabilityCoverage) : undefined,
        death_coverage: acc.Insurance?.DeathCoverage ? parseFloat(acc.Insurance.DeathCoverage) : undefined
      }
    }));
  }

  // ============================================
  // MAPPING - המרה למודל קנוני
  // ============================================

  /**
   * המרת נתוני מסלקה למודל קנוני
   */
  private mapToPensionAccount(raw: MislakaPensionData, customerId: string): PensionAccount {
    const now = new Date().toISOString();
    
    // מיפוי סוג חשבון
    const accountTypeMap: Record<string, PensionAccount['account_type']> = {
      'PENSION_COMPREHENSIVE': 'pension_comprehensive',
      'PENSION_GENERAL': 'pension_general',
      'PROVIDENT': 'provident_fund',
      'SEVERANCE': 'severance_fund',
      'GEMEL_SAVINGS': 'gemel_savings',
      'GEMEL_INVESTMENT': 'gemel_investment'
    };

    const statusMap: Record<string, PensionAccount['status']> = {
      'ACTIVE': 'active',
      'FROZEN': 'frozen',
      'TRANSFERRED': 'transferred',
      'CLOSED': 'closed'
    };

    const account: PensionAccount = {
      id: uuidv4(),
      account_number: raw.account_number,
      customer_id: customerId, // Should be UUID
      account_type: accountTypeMap[raw.account_type] || 'pension_comprehensive',
      managing_company: raw.managing_company,
      managing_company_code: raw.managing_company_code,
      fund_name: raw.fund_name,
      fund_number: raw.fund_number,
      balance: {
        total: raw.balance.total,
        severance: raw.balance.severance,
        employer_contributions: raw.balance.employer,
        employee_contributions: raw.balance.employee,
        returns: raw.balance.returns,
        as_of_date: raw.balance.as_of_date
      },
      contributions: raw.contributions ? {
        monthly_salary: raw.contributions.monthly_salary,
        employee_rate: raw.contributions.employee_rate,
        employer_rate: raw.contributions.employer_rate,
        severance_rate: raw.contributions.severance_rate,
        last_contribution_date: raw.contributions.last_contribution_date
      } : undefined,
      management_fees: {
        savings_fee_percent: raw.fees.savings_fee,
        contributions_fee_percent: raw.fees.contributions_fee
      },
      insurance_coverage: raw.insurance ? {
        disability: raw.insurance.disability_coverage ? {
          coverage_amount: raw.insurance.disability_coverage
        } : undefined,
        death: raw.insurance.death_coverage ? {
          coverage_amount: raw.insurance.death_coverage
        } : undefined
      } : undefined,
      status: statusMap[raw.status] || 'active',
      created_at: now,
      updated_at: now,
      source_system: 'mislaka',
      raw_data: raw
    };

    return PensionAccountSchema.parse(account);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createMislakaConnector(config?: Partial<MislakaConfig>): MislakaConnector {
  const fullConfig: MislakaConfig = {
    apiUrl: process.env.MISLAKA_API_URL || 'https://api.mislaka-api.co.il',
    wsdlUrl: process.env.MISLAKA_WSDL_URL,
    clientId: process.env.MISLAKA_CLIENT_ID || '',
    clientSecret: process.env.MISLAKA_CLIENT_SECRET || '',
    certificatePath: process.env.MISLAKA_CERT_PATH,
    certificatePassword: process.env.MISLAKA_CERT_PASSWORD,
    sftpHost: process.env.MISLAKA_SFTP_HOST,
    sftpUser: process.env.MISLAKA_SFTP_USER,
    sftpPassword: process.env.MISLAKA_SFTP_PASSWORD,
    sftpPath: process.env.MISLAKA_SFTP_PATH,
    timeout: 60000,
    ...config
  };

  return new MislakaConnector(fullConfig);
}

// ============================================
// MOCK IMPLEMENTATION
// ============================================

export class MislakaMockConnector extends MislakaConnector {
  constructor() {
    super({
      apiUrl: 'http://localhost:3000/mock/mislaka',
      clientId: 'mock-client',
      clientSecret: 'mock-secret'
    });
  }

  async authenticate(): Promise<string> {
    return 'mock-token';
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getPensionAccounts(customerId: string): Promise<PensionAccount[]> {
    const mockData: MislakaPensionData = {
      account_number: 'PEN-123456',
      fund_name: 'קרן הפנסיה הכללית',
      fund_number: '512345678',
      managing_company: 'מגדל מקפת',
      managing_company_code: '03',
      account_type: 'PENSION_COMPREHENSIVE',
      status: 'ACTIVE',
      balance: {
        total: 450000,
        severance: 75000,
        employer: 180000,
        employee: 120000,
        returns: 75000,
        as_of_date: new Date().toISOString()
      },
      contributions: {
        monthly_salary: 25000,
        employee_rate: 6,
        employer_rate: 6.5,
        severance_rate: 6,
        last_contribution_date: new Date().toISOString()
      },
      fees: {
        savings_fee: 0.5,
        contributions_fee: 1.5
      },
      insurance: {
        disability_coverage: 15000,
        death_coverage: 500000
      }
    };

    return [this['mapToPensionAccount'](mockData, customerId)];
  }
}
