/**
 * SELAI Insurance Integration Hub
 * Connectors Configuration - הגדרות קונקטורים
 *
 * Configuration for all insurance data source connectors
 */

import { z } from 'zod';
import { ConnectorType, AuthMethod } from '../connectors/connector-interface.js';

// ============================================
// BASE CONNECTOR CONFIG SCHEMA
// ============================================

const BaseConnectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  useMocks: z.boolean().default(false)
});

type BaseConnectorConfig = z.infer<typeof BaseConnectorConfigSchema>;

// ============================================
// HAR HABITOUACH CONFIG
// ============================================

const HarHabitouachConfigSchema = BaseConnectorConfigSchema.extend({
  wsdlUrl: z.string().optional()
});

export type HarHabitouachConfig = z.infer<typeof HarHabitouachConfigSchema>;

// ============================================
// MISLAKA CONFIG
// ============================================

const MislakaConfigSchema = BaseConnectorConfigSchema.extend({
  wsdlUrl: z.string().optional(),
  certPath: z.string().optional(),
  certPassword: z.string().optional(),
  sftp: z.object({
    host: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    path: z.string().default('/data')
  }).optional()
});

export type MislakaConfig = z.infer<typeof MislakaConfigSchema>;

// ============================================
// CARRIER CONFIG
// ============================================

const CarrierConfigSchema = BaseConnectorConfigSchema.extend({
  carrierCode: z.string(),
  carrierName: z.string(),
  carrierNameHebrew: z.string()
});

export type CarrierConfig = z.infer<typeof CarrierConfigSchema>;

// ============================================
// SURENSE CONFIG
// ============================================

const SurenseConfigSchema = BaseConnectorConfigSchema.extend({
  agencyCode: z.string().optional()
});

export type SurenseConfig = z.infer<typeof SurenseConfigSchema>;

// ============================================
// FULL CONNECTORS CONFIG
// ============================================

const ConnectorsConfigSchema = z.object({
  // הר הביטוח - Vehicle Insurance
  harHabitouach: HarHabitouachConfigSchema,

  // המסלקה הפנסיונית - Pension
  mislaka: MislakaConfigSchema,

  // Aggregator
  surense: SurenseConfigSchema,

  // Insurance Carriers
  carriers: z.object({
    clal: CarrierConfigSchema,
    harel: CarrierConfigSchema,
    migdal: CarrierConfigSchema,
    phoenix: CarrierConfigSchema,
    menora: CarrierConfigSchema,
    ayalon: CarrierConfigSchema,
    bituachYashir: CarrierConfigSchema,
    libra: CarrierConfigSchema,
    aig: CarrierConfigSchema
  })
});

export type ConnectorsConfig = z.infer<typeof ConnectorsConfigSchema>;

// ============================================
// CARRIER DEFINITIONS
// ============================================

/**
 * Israeli insurance carrier definitions
 */
export const CarrierDefinitions = {
  CLAL: {
    code: '01',
    name: 'Clal Insurance',
    nameHebrew: 'כלל ביטוח',
    envPrefix: 'CLAL'
  },
  HAREL: {
    code: '02',
    name: 'Harel Insurance',
    nameHebrew: 'הראל ביטוח',
    envPrefix: 'HAREL'
  },
  MIGDAL: {
    code: '03',
    name: 'Migdal Insurance',
    nameHebrew: 'מגדל ביטוח',
    envPrefix: 'MIGDAL'
  },
  PHOENIX: {
    code: '04',
    name: 'The Phoenix',
    nameHebrew: 'הפניקס',
    envPrefix: 'PHOENIX'
  },
  MENORA: {
    code: '05',
    name: 'Menora Mivtachim',
    nameHebrew: 'מנורה מבטחים',
    envPrefix: 'MENORA'
  },
  AYALON: {
    code: '06',
    name: 'Ayalon Insurance',
    nameHebrew: 'איילון ביטוח',
    envPrefix: 'AYALON'
  },
  BITUACH_YASHIR: {
    code: '07',
    name: 'Bituach Yashir',
    nameHebrew: 'ביטוח ישיר',
    envPrefix: 'BITUACH_YASHIR'
  },
  LIBRA: {
    code: '08',
    name: 'Libra Insurance',
    nameHebrew: 'ליברה',
    envPrefix: 'LIBRA'
  },
  AIG: {
    code: '09',
    name: 'AIG Israel',
    nameHebrew: 'AIG ישראל',
    envPrefix: 'AIG'
  },
  SHLOMO: {
    code: '10',
    name: 'Shlomo Insurance',
    nameHebrew: 'שלמה ביטוח',
    envPrefix: 'SHLOMO'
  },
  DIKLA: {
    code: '11',
    name: 'Dikla Insurance',
    nameHebrew: 'דיקלה ביטוח',
    envPrefix: 'DIKLA'
  },
  PASSPORTCARD: {
    code: '12',
    name: 'PassportCard',
    nameHebrew: 'פספורטכארד',
    envPrefix: 'PASSPORTCARD'
  },
  ALTSHULER: {
    code: '13',
    name: 'Altshuler Shaham',
    nameHebrew: 'אלטשולר שחם',
    envPrefix: 'ALTSHULER'
  },
  MORE: {
    code: '14',
    name: 'More Investment House',
    nameHebrew: 'מור בית השקעות',
    envPrefix: 'MORE'
  }
} as const;

export type CarrierId = keyof typeof CarrierDefinitions;

// ============================================
// LOAD CONNECTOR CONFIG
// ============================================

function loadCarrierConfig(definition: typeof CarrierDefinitions[CarrierId]): CarrierConfig {
  const prefix = definition.envPrefix;

  return {
    enabled: process.env[`${prefix}_ENABLED`] !== 'false',
    apiUrl: process.env[`${prefix}_API_URL`],
    apiKey: process.env[`${prefix}_API_KEY`],
    clientId: process.env[`${prefix}_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`],
    timeout: parseInt(process.env[`${prefix}_TIMEOUT`] || '30000', 10),
    retries: parseInt(process.env[`${prefix}_RETRIES`] || '3', 10),
    useMocks: process.env[`${prefix}_USE_MOCKS`] === 'true' || process.env.USE_MOCKS === 'true',
    carrierCode: definition.code,
    carrierName: definition.name,
    carrierNameHebrew: definition.nameHebrew
  };
}

function loadConnectorsConfig(): ConnectorsConfig {
  const useMocksGlobal = process.env.USE_MOCKS === 'true';

  return {
    // Har HaBitouach
    harHabitouach: {
      enabled: process.env.HAR_HABITOUACH_ENABLED !== 'false',
      apiUrl: process.env.HAR_HABITOUACH_API_URL,
      apiKey: process.env.HAR_HABITOUACH_API_KEY,
      clientId: process.env.HAR_HABITOUACH_CLIENT_ID,
      clientSecret: process.env.HAR_HABITOUACH_CLIENT_SECRET,
      timeout: parseInt(process.env.HAR_HABITOUACH_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.HAR_HABITOUACH_RETRIES || '3', 10),
      useMocks: process.env.HAR_HABITOUACH_USE_MOCKS === 'true' || useMocksGlobal,
      wsdlUrl: process.env.HAR_HABITOUACH_WSDL_URL
    },

    // Mislaka
    mislaka: {
      enabled: process.env.MISLAKA_ENABLED !== 'false',
      apiUrl: process.env.MISLAKA_API_URL,
      apiKey: process.env.MISLAKA_API_KEY,
      clientId: process.env.MISLAKA_CLIENT_ID,
      clientSecret: process.env.MISLAKA_CLIENT_SECRET,
      timeout: parseInt(process.env.MISLAKA_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.MISLAKA_RETRIES || '3', 10),
      useMocks: process.env.MISLAKA_USE_MOCKS === 'true' || useMocksGlobal,
      wsdlUrl: process.env.MISLAKA_WSDL_URL,
      certPath: process.env.MISLAKA_CERT_PATH,
      certPassword: process.env.MISLAKA_CERT_PASSWORD,
      sftp: {
        host: process.env.MISLAKA_SFTP_HOST,
        user: process.env.MISLAKA_SFTP_USER,
        password: process.env.MISLAKA_SFTP_PASSWORD,
        path: process.env.MISLAKA_SFTP_PATH || '/data'
      }
    },

    // Surense
    surense: {
      enabled: process.env.SURENSE_ENABLED !== 'false',
      apiUrl: process.env.SURENSE_API_URL,
      apiKey: process.env.SURENSE_API_KEY,
      clientId: process.env.SURENSE_CLIENT_ID,
      clientSecret: process.env.SURENSE_CLIENT_SECRET,
      timeout: parseInt(process.env.SURENSE_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.SURENSE_RETRIES || '3', 10),
      useMocks: process.env.SURENSE_USE_MOCKS === 'true' || useMocksGlobal,
      agencyCode: process.env.SURENSE_AGENCY_CODE
    },

    // Carriers
    carriers: {
      clal: loadCarrierConfig(CarrierDefinitions.CLAL),
      harel: loadCarrierConfig(CarrierDefinitions.HAREL),
      migdal: loadCarrierConfig(CarrierDefinitions.MIGDAL),
      phoenix: loadCarrierConfig(CarrierDefinitions.PHOENIX),
      menora: loadCarrierConfig(CarrierDefinitions.MENORA),
      ayalon: loadCarrierConfig(CarrierDefinitions.AYALON),
      bituachYashir: loadCarrierConfig(CarrierDefinitions.BITUACH_YASHIR),
      libra: loadCarrierConfig(CarrierDefinitions.LIBRA),
      aig: loadCarrierConfig(CarrierDefinitions.AIG)
    }
  };
}

// ============================================
// EXPORT
// ============================================

export const connectorsConfig = loadConnectorsConfig();

/**
 * Get configuration for a specific carrier
 */
export function getCarrierConfig(carrierId: string): CarrierConfig | undefined {
  const key = carrierId.toLowerCase() as keyof typeof connectorsConfig.carriers;
  return connectorsConfig.carriers[key];
}

/**
 * Get all enabled carrier configurations
 */
export function getEnabledCarriers(): CarrierConfig[] {
  return Object.values(connectorsConfig.carriers).filter(c => c.enabled);
}

/**
 * Check if a connector is configured (has API URL or mocks enabled)
 */
export function isConnectorConfigured(config: BaseConnectorConfig): boolean {
  return !!(config.apiUrl || config.useMocks);
}

/**
 * Get connector metadata for display
 */
export interface ConnectorInfo {
  code: string;
  name: string;
  nameHebrew: string;
  type: ConnectorType;
  authMethod: AuthMethod;
  enabled: boolean;
  configured: boolean;
}

export function getConnectorInfo(): ConnectorInfo[] {
  const info: ConnectorInfo[] = [];

  // Har HaBitouach
  info.push({
    code: 'HAR_HABITOUACH',
    name: 'Har HaBitouach',
    nameHebrew: 'הר הביטוח',
    type: ConnectorType.VEHICLE,
    authMethod: AuthMethod.OAUTH2,
    enabled: connectorsConfig.harHabitouach.enabled,
    configured: isConnectorConfigured(connectorsConfig.harHabitouach)
  });

  // Mislaka
  info.push({
    code: 'MISLAKA',
    name: 'Mislaka Pensionit',
    nameHebrew: 'המסלקה הפנסיונית',
    type: ConnectorType.PENSION,
    authMethod: AuthMethod.CERTIFICATE,
    enabled: connectorsConfig.mislaka.enabled,
    configured: isConnectorConfigured(connectorsConfig.mislaka)
  });

  // Surense
  info.push({
    code: 'SURENSE',
    name: 'Surense',
    nameHebrew: 'Surense',
    type: ConnectorType.AGGREGATOR,
    authMethod: AuthMethod.API_KEY,
    enabled: connectorsConfig.surense.enabled,
    configured: isConnectorConfigured(connectorsConfig.surense)
  });

  // Carriers
  for (const [key, definition] of Object.entries(CarrierDefinitions)) {
    const config = getCarrierConfig(key.toLowerCase());
    if (config) {
      info.push({
        code: key,
        name: definition.name,
        nameHebrew: definition.nameHebrew,
        type: ConnectorType.CARRIER,
        authMethod: AuthMethod.OAUTH2,
        enabled: config.enabled,
        configured: isConnectorConfigured(config)
      });
    }
  }

  return info;
}
