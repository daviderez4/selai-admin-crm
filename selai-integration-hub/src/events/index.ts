/**
 * SELAI Insurance Integration Hub
 * Events Index - Export all event handling utilities
 */

// Event Handlers
export {
  PolicyEventHandler,
  policyEventHandler,
  registerPolicyHandlers,
  type PolicyCreatedEvent,
  type PolicyUpdatedEvent,
  type PolicyCancelledEvent,
  type PolicyExpiringEvent
} from './handlers/policy-event-handler.js';

export {
  CustomerEventHandler,
  customerEventHandler,
  registerCustomerHandlers,
  type CustomerDataSyncedEvent,
  type CustomerGapsDetectedEvent,
  type CustomerProfileUpdatedEvent
} from './handlers/customer-event-handler.js';

// Orchestrator
export {
  EventOrchestrator,
  getEventOrchestrator,
  startEventOrchestrator,
  type OrchestratorConfig,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowContext
} from './event-orchestrator.js';
