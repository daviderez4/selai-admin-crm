/**
 * SELAI Insurance Integration Hub
 * OpenAPI Specification - API Documentation
 */

import { FastifyInstance } from 'fastify';

// ============================================
// OPENAPI DOCUMENT
// ============================================

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SELAI Insurance Integration Hub API',
    description: `
# Overview

The SELAI Insurance Integration Hub provides a unified API for accessing insurance and pension data from multiple Israeli carriers.

## Features

- **Multi-carrier Integration**: Connect to 14+ Israeli insurance carriers
- **Pension Data**: Access Mislaka pension clearing house data
- **Quote Comparison**: Compare quotes from multiple carriers
- **Coverage Analysis**: Detect coverage gaps and get recommendations
- **Real-time Events**: Subscribe to policy and claim updates via webhooks

## Authentication

The API supports two authentication methods:

1. **JWT Bearer Token**: For user-based access
2. **API Key**: For service-to-service communication

Include the authentication in your request headers:

\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

or

\`\`\`
X-API-Key: <api_key>
\`\`\`

## Rate Limiting

API requests are rate-limited based on your subscription tier:

| Tier | Requests/min | Requests/hour | Requests/day |
|------|--------------|---------------|--------------|
| Free | 20 | 200 | 1,000 |
| Basic | 60 | 1,000 | 10,000 |
| Professional | 200 | 5,000 | 50,000 |
| Enterprise | 1,000 | 30,000 | 500,000 |

Rate limit headers are included in all responses.

## Versioning

The API uses URL path versioning. Current version is v2.

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`
`,
    version: '2.0.0',
    contact: {
      name: 'SELAI Support',
      email: 'support@selai.io',
      url: 'https://selai.io'
    },
    license: {
      name: 'Proprietary',
      url: 'https://selai.io/terms'
    }
  },
  servers: [
    {
      url: 'https://api.selai.io',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.selai.io',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'Authentication endpoints' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Policies', description: 'Policy operations' },
    { name: 'Quotes', description: 'Quote comparison' },
    { name: 'Analytics', description: 'Coverage analysis and insights' },
    { name: 'Connectors', description: 'Data source management' },
    { name: 'System', description: 'System health and status' }
  ],
  paths: {
    '/api/v2/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and receive JWT tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Successful login',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse'
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/v2/customers/{customerId}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer details',
        description: 'Retrieve complete customer profile including policies and pension accounts',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'include',
            in: 'query',
            description: 'Additional data to include',
            schema: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['policies', 'pension', 'claims', 'gaps']
              }
            }
          }
        ],
        responses: {
          '200': {
            description: 'Customer details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Customer360Response'
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/v2/customers/search': {
      get: {
        tags: ['Customers'],
        summary: 'Search customers',
        description: 'Search customers by ID number, name, or other criteria',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: 'id_number',
            in: 'query',
            schema: { type: 'string', pattern: '^\\d{9}$' }
          },
          {
            name: 'name',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 }
          }
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CustomerSearchResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/quotes/compare': {
      post: {
        tags: ['Quotes'],
        summary: 'Compare quotes',
        description: 'Request and compare quotes from multiple insurance carriers',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/QuoteCompareRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Quote comparison results',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/QuoteCompareResponse'
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' }
        }
      }
    },
    '/api/v2/analytics/portfolio': {
      post: {
        tags: ['Analytics'],
        summary: 'Analyze portfolio',
        description: 'Comprehensive analysis of customer insurance portfolio',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PortfolioAnalysisRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Portfolio analysis results',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PortfolioAnalysisResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/analytics/gaps/{customerId}': {
      get: {
        tags: ['Analytics'],
        summary: 'Get coverage gaps',
        description: 'Identify coverage gaps and recommendations for a customer',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        parameters: [
          {
            name: 'customerId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Coverage gaps',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CoverageGapsResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/connectors': {
      get: {
        tags: ['Connectors'],
        summary: 'List connectors',
        description: 'Get status of all data source connectors',
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        responses: {
          '200': {
            description: 'Connector list',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ConnectorListResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check API health status',
        responses: {
          '200': {
            description: 'Healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              refresh_token: { type: 'string' },
              expires_in: { type: 'integer' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' }
                }
              }
            }
          }
        }
      },
      Customer360Response: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              id_number: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              policies: { type: 'array', items: { $ref: '#/components/schemas/Policy' } },
              pension_accounts: { type: 'array', items: { $ref: '#/components/schemas/PensionAccount' } },
              coverage_score: { type: 'integer' },
              coverage_grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] }
            }
          }
        }
      },
      CustomerSearchResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              customers: { type: 'array', items: { $ref: '#/components/schemas/CustomerSummary' } },
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' }
            }
          }
        }
      },
      CustomerSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          id_number: { type: 'string' },
          name: { type: 'string' },
          policies_count: { type: 'integer' },
          total_premium: { type: 'number' }
        }
      },
      Policy: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          policy_number: { type: 'string' },
          insurance_type: { type: 'string' },
          carrier_code: { type: 'string' },
          status: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          premium_amount: { type: 'number' },
          coverage_amount: { type: 'number' }
        }
      },
      PensionAccount: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          account_number: { type: 'string' },
          account_type: { type: 'string' },
          managing_company: { type: 'string' },
          balance: { type: 'number' },
          management_fees: {
            type: 'object',
            properties: {
              savings_fee_percent: { type: 'number' },
              contributions_fee_percent: { type: 'number' }
            }
          }
        }
      },
      QuoteCompareRequest: {
        type: 'object',
        required: ['id_number', 'insurance_type', 'coverage_amount', 'start_date'],
        properties: {
          id_number: { type: 'string', pattern: '^\\d{9}$' },
          insurance_type: { type: 'string' },
          coverage_amount: { type: 'number' },
          deductible: { type: 'number' },
          start_date: { type: 'string', format: 'date' },
          carriers: { type: 'array', items: { type: 'string' } }
        }
      },
      QuoteCompareResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              request_id: { type: 'string' },
              quotes: { type: 'array', items: { $ref: '#/components/schemas/RankedQuote' } },
              best_value: { $ref: '#/components/schemas/RankedQuote' },
              lowest_price: { $ref: '#/components/schemas/RankedQuote' }
            }
          }
        }
      },
      RankedQuote: {
        type: 'object',
        properties: {
          carrier_code: { type: 'string' },
          carrier_name: { type: 'string' },
          monthly_premium: { type: 'number' },
          annual_premium: { type: 'number' },
          coverage_details: { type: 'object' },
          ranking_score: { type: 'number' },
          rank_position: { type: 'integer' }
        }
      },
      PortfolioAnalysisRequest: {
        type: 'object',
        required: ['customer_id'],
        properties: {
          customer_id: { type: 'string', format: 'uuid' },
          profile: {
            type: 'object',
            properties: {
              age: { type: 'integer' },
              has_dependents: { type: 'boolean' },
              owns_property: { type: 'boolean' },
              owns_vehicle: { type: 'boolean' }
            }
          }
        }
      },
      PortfolioAnalysisResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              score: { type: 'integer' },
              grade: { type: 'string' },
              gaps_count: { type: 'integer' },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
      CoverageGapsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              customer_id: { type: 'string' },
              gaps_count: { type: 'integer' },
              gaps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    gap_type: { type: 'string' },
                    title: { type: 'string' },
                    priority: { type: 'string' },
                    recommended_coverage: { type: 'number' },
                    estimated_premium: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      },
      ConnectorListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              connectors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string' },
                    last_health_check: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          version: { type: 'string' },
          timestamp: { type: 'string' },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string' },
              cache: { type: 'string' },
              event_bus: { type: 'string' }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  }
};

// ============================================
// REGISTER SWAGGER UI
// ============================================

export async function registerOpenAPI(fastify: FastifyInstance): Promise<void> {
  // Register swagger plugin
  await fastify.register(import('@fastify/swagger'), {
    openapi: openapiDocument as any
  });

  // Register swagger UI
  await fastify.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });

  // JSON spec endpoint
  fastify.get('/api/openapi.json', async () => openapiDocument);
}
