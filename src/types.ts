export interface AbstractTrigger {
  name: string;
  type: string;
  service: string;
  configuration: Record<string, any>;
}

export interface AbstractCondition {
  field: string;
  operator: string;
  value: any;
  description: string;
}

export interface AbstractAction {
  name: string;
  service: string;
  operation: string;
  parameters: Record<string, any>;
}

export interface AbstractWorkflowSchema {
  title: string;
  summary: string;
  trigger: AbstractTrigger;
  conditions: AbstractCondition[];
  actions: AbstractAction[];
  required_credentials: string[];
}

export interface ExecutionRecord {
  id: string;
  workflow_id: string;
  n8n_execution_id: string;
  status: "success" | "failed" | "healed";
  input_payload: any;
  output_payload?: any;
  error_trace?: string;
  was_self_healed: boolean;
  healing_summary?: string;
  created_at: string;
}

export interface WorkflowRecord {
  id: string;
  title: string;
  original_prompt: string;
  n8n_workflow_id: string;
  n8n_workflow_json: {
    name: string;
    nodes: Array<{
      id: string;
      name: string;
      type: string;
      typeVersion?: number;
      position: [number, number];
      parameters?: Record<string, any>;
    }>;
    connections: Record<string, any>;
    settings?: Record<string, any>;
  };
  abstract_schema: AbstractWorkflowSchema;
  status: "draft" | "deployed" | "active" | "error" | "self_healing";
  is_active: boolean;
  webhook_url: string;
  version: number;
  created_at: string;
  updated_at: string;
  executions: ExecutionRecord[];
}

export interface HealingDiagnosis {
  root_cause: string;
  failed_node_name: string;
  fix_applied: string;
  prevention_tip: string;
}

export interface SystemStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  healed_executions: number;
  healing_rate: number;
}
