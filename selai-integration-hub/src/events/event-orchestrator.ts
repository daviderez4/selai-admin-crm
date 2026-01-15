/**
 * SELAI Insurance Integration Hub
 * Event Orchestrator - Central event coordination and workflow management
 */

import { EventBusService, getEventBus, TOPICS, EventMessage } from '../services/event-bus.js';
import { registerPolicyHandlers } from './handlers/policy-event-handler.js';
import { registerCustomerHandlers } from './handlers/customer-event-handler.js';
import { logger, createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('EventOrchestrator');

// ============================================
// TYPES
// ============================================

export interface OrchestratorConfig {
  enablePolicyHandlers?: boolean;
  enableCustomerHandlers?: boolean;
  enableClaimHandlers?: boolean;
  enablePaymentHandlers?: boolean;
  enablePensionHandlers?: boolean;
  enableNotificationHandlers?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  triggerEvent: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  action: (data: any, context: WorkflowContext) => Promise<any>;
  onSuccess?: string; // Next step name
  onFailure?: string; // Fallback step name
  retries?: number;
  timeout?: number;
}

export interface WorkflowContext {
  workflowId: string;
  workflowName: string;
  triggeredBy: string;
  startedAt: string;
  data: Record<string, any>;
  results: Record<string, any>;
}

// ============================================
// EVENT ORCHESTRATOR CLASS
// ============================================

export class EventOrchestrator {
  private eventBus: EventBusService;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private activeWorkflows: Map<string, WorkflowContext> = new Map();
  private isRunning = false;

  constructor(eventBus: EventBusService) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize and start the orchestrator
   */
  async start(config: OrchestratorConfig = {}): Promise<void> {
    if (this.isRunning) {
      log.warn('Orchestrator already running');
      return;
    }

    log.info('Starting event orchestrator', { config });

    // Register event handlers based on config
    const enableAll = Object.keys(config).length === 0;

    if (enableAll || config.enablePolicyHandlers) {
      registerPolicyHandlers(this.eventBus);
    }

    if (enableAll || config.enableCustomerHandlers) {
      registerCustomerHandlers(this.eventBus);
    }

    // Register built-in workflows
    this.registerBuiltInWorkflows();

    // Start consuming events
    await this.eventBus.startConsuming();

    this.isRunning = true;
    log.info('Event orchestrator started successfully');
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    log.info('Stopping event orchestrator');

    // Wait for active workflows to complete (with timeout)
    const timeout = 30000;
    const startTime = Date.now();
    while (this.activeWorkflows.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeWorkflows.size > 0) {
      log.warn('Some workflows did not complete before shutdown', {
        activeCount: this.activeWorkflows.size
      });
    }

    this.isRunning = false;
    log.info('Event orchestrator stopped');
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.name, workflow);

    // Subscribe to trigger event
    this.eventBus.subscribe(workflow.triggerEvent as any, async (event) => {
      await this.executeWorkflow(workflow.name, event);
    });

    log.info('Workflow registered', { workflowName: workflow.name, trigger: workflow.triggerEvent });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowName: string, triggerEvent: EventMessage): Promise<void> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      log.error('Workflow not found', { workflowName });
      return;
    }

    const workflowId = `${workflowName}-${triggerEvent.id}`;
    const context: WorkflowContext = {
      workflowId,
      workflowName,
      triggeredBy: triggerEvent.id,
      startedAt: new Date().toISOString(),
      data: { triggerEvent: triggerEvent.data },
      results: {}
    };

    this.activeWorkflows.set(workflowId, context);
    log.info('Starting workflow execution', { workflowId, workflowName });

    try {
      let currentStep: WorkflowStep | undefined = workflow.steps[0];

      while (currentStep) {
        const stepName = currentStep.name;
        log.debug('Executing workflow step', { workflowId, stepName });

        try {
          const result = await this.executeStep(currentStep, context);
          context.results[stepName] = result;

          // Determine next step
          if (currentStep.onSuccess) {
            currentStep = workflow.steps.find(s => s.name === currentStep!.onSuccess);
          } else {
            // Move to next sequential step
            const currentIndex = workflow.steps.indexOf(currentStep);
            currentStep = workflow.steps[currentIndex + 1];
          }
        } catch (stepError) {
          log.error('Workflow step failed', { workflowId, stepName, error: stepError });

          if (currentStep.onFailure) {
            currentStep = workflow.steps.find(s => s.name === currentStep!.onFailure);
          } else {
            throw stepError;
          }
        }
      }

      log.info('Workflow completed successfully', { workflowId });
    } catch (error) {
      log.error('Workflow failed', { workflowId, error });
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute a single workflow step with retry logic
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const maxRetries = step.retries || 3;
    const timeout = step.timeout || 30000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          step.action(context.data, context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Step timeout')), timeout)
          )
        ]);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        log.warn('Step failed, retrying', {
          stepName: step.name,
          attempt,
          maxRetries,
          error
        });
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Register built-in workflows
   */
  private registerBuiltInWorkflows(): void {
    // Customer Onboarding Workflow
    this.registerWorkflow({
      name: 'customer_onboarding',
      triggerEvent: TOPICS.CUSTOMER_DATA_SYNCED,
      steps: [
        {
          name: 'analyze_coverage',
          action: async (data, ctx) => {
            log.debug('Analyzing customer coverage', { customerId: data.triggerEvent.customer_id });
            return { analyzed: true };
          }
        },
        {
          name: 'detect_gaps',
          action: async (data, ctx) => {
            log.debug('Detecting coverage gaps', { customerId: data.triggerEvent.customer_id });
            return { gapsDetected: 0 };
          }
        },
        {
          name: 'create_welcome_notification',
          action: async (data, ctx) => {
            log.debug('Creating welcome notification', { customerId: data.triggerEvent.customer_id });
            return { notificationSent: true };
          }
        }
      ]
    });

    // Policy Renewal Workflow
    this.registerWorkflow({
      name: 'policy_renewal',
      triggerEvent: TOPICS.POLICY_EXPIRING,
      steps: [
        {
          name: 'fetch_renewal_quotes',
          action: async (data, ctx) => {
            log.debug('Fetching renewal quotes', { policyId: data.triggerEvent.policy_id });
            return { quotesCount: 3 };
          }
        },
        {
          name: 'compare_quotes',
          action: async (data, ctx) => {
            log.debug('Comparing renewal quotes');
            return { bestQuote: null };
          }
        },
        {
          name: 'notify_agent',
          action: async (data, ctx) => {
            log.debug('Notifying agent about renewal');
            return { agentNotified: true };
          }
        }
      ]
    });

    // Claim Processing Workflow
    this.registerWorkflow({
      name: 'claim_processing',
      triggerEvent: TOPICS.CLAIM_SUBMITTED,
      steps: [
        {
          name: 'validate_claim',
          action: async (data, ctx) => {
            log.debug('Validating claim', { claimId: data.triggerEvent.claim_id });
            return { valid: true };
          }
        },
        {
          name: 'check_coverage',
          action: async (data, ctx) => {
            log.debug('Checking policy coverage');
            return { covered: true };
          }
        },
        {
          name: 'submit_to_carrier',
          action: async (data, ctx) => {
            log.debug('Submitting claim to carrier');
            return { submitted: true };
          }
        },
        {
          name: 'notify_customer',
          action: async (data, ctx) => {
            log.debug('Notifying customer about claim status');
            return { notified: true };
          }
        }
      ]
    });

    log.info('Built-in workflows registered', {
      workflows: ['customer_onboarding', 'policy_renewal', 'claim_processing']
    });
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(): {
    registeredWorkflows: string[];
    activeWorkflows: number;
    isRunning: boolean;
  } {
    return {
      registeredWorkflows: Array.from(this.workflows.keys()),
      activeWorkflows: this.activeWorkflows.size,
      isRunning: this.isRunning
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let orchestratorInstance: EventOrchestrator | null = null;

export function getEventOrchestrator(): EventOrchestrator {
  if (!orchestratorInstance) {
    const eventBus = getEventBus();
    orchestratorInstance = new EventOrchestrator(eventBus);
  }
  return orchestratorInstance;
}

export async function startEventOrchestrator(
  config?: OrchestratorConfig
): Promise<EventOrchestrator> {
  const orchestrator = getEventOrchestrator();
  await orchestrator.start(config);
  return orchestrator;
}
