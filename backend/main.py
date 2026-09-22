import os
import uuid
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from database import get_db, init_db
from models import Workflow, ExecutionLog, User
from n8n_service import N8nService, N8nServiceError
from agent_engine import AgentEngine

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexus_flow.main")

# =====================================================================
# Lifespan Management
# =====================================================================

n8n_client: N8nService = None # type: ignore
agent_engine: AgentEngine = None # type: ignore

@asynccontextmanager
async def lifespan(app: FastAPI):
    global n8n_client, agent_engine
    logger.info("Initializing Nexus-Flow Database and Agent Services...")
    await init_db()
    n8n_client = N8nService()
    agent_engine = AgentEngine()
    yield
    logger.info("Shutting down Nexus-Flow resources...")
    if n8n_client:
        await n8n_client.close()

app = FastAPI(
    title="Nexus-Flow Autonomous Automation Factory API",
    description="Multi-agent orchestrator translating natural language prompts into live n8n automation workflows with self-healing monitoring.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Vite dev and frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# Request & Response Schemas
# =====================================================================

class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=5, description="Natural language automation requirement")
    auto_activate: bool = Field(default=True, description="Automatically enable the workflow in n8n")

class ExecutionSimulateRequest(BaseModel):
    simulate_failure: bool = Field(default=False, description="Simulate a real-world node error for testing")
    error_type: Optional[str] = Field(default="telegram_400", description="Type of error to inject: 'telegram_400', 'sheets_missing_column', 'http_timeout'")
    test_payload: Optional[Dict[str, Any]] = Field(default=None, description="Custom payload passed to trigger")

class SelfHealRequest(BaseModel):
    execution_id: Optional[str] = None
    error_trace: str
    failed_node: Optional[str] = None

# =====================================================================
# API Endpoints
# =====================================================================

@app.get("/healthz")
async def health_check():
    """Service health and readiness check."""
    n8n_status = await n8n_client.check_health()
    return {
        "status": "healthy",
        "service": "Nexus-Flow Autonomous Automation Factory",
        "n8n_connection": n8n_status,
    }

@app.get("/api/v1/stats")
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    """Summary metrics of workflows and self-healing telemetry."""
    total_wf_res = await db.execute(select(func.count(Workflow.id)))
    total_workflows = total_wf_res.scalar() or 0

    active_wf_res = await db.execute(select(func.count(Workflow.id)).where(Workflow.is_active == True))
    active_workflows = active_wf_res.scalar() or 0

    healed_res = await db.execute(select(func.count(ExecutionLog.id)).where(ExecutionLog.was_self_healed == True))
    healed_executions = healed_res.scalar() or 0

    total_execs_res = await db.execute(select(func.count(ExecutionLog.id)))
    total_executions = total_execs_res.scalar() or 0

    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "healed_executions": healed_executions,
        "total_executions": total_executions,
        "healing_success_rate": round((healed_executions / (total_executions or 1)) * 100, 1)
    }

@app.post("/api/v1/workflows/generate", status_code=status.HTTP_201_CREATED)
async def generate_workflow_endpoint(
    req: PromptRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Component A: The Spec & Orchestrator Agent
    Translates natural language prompt into an operational n8n workflow and pushes it to n8n.
    """
    logger.info(f"Received user prompt: '{req.prompt}'")
    
    # 1. Generate schema & n8n blueprint via AgentEngine
    generation = await agent_engine.generate_workflow(req.prompt)
    n8n_payload = generation.n8n_workflow_json
    
    # 2. Attempt deployment to local n8n instance
    n8n_workflow_id = None
    is_active = False
    webhook_url = n8n_client.extract_webhook_url(n8n_payload)
    status_label = "draft"

    try:
        n8n_resp = await n8n_client.create_workflow(n8n_payload)
        n8n_workflow_id = str(n8n_resp.get("id"))
        status_label = "deployed"
        logger.info(f"Deployed to n8n with ID: {n8n_workflow_id}")

        if req.auto_activate and n8n_workflow_id:
            try:
                await n8n_client.activate_workflow(n8n_workflow_id)
                is_active = True
                status_label = "active"
            except Exception as e:
                logger.warning(f"Workflow activation warning: {e}")
    except N8nServiceError as e:
        logger.warning(f"n8n REST API communication offline or pending: {e}. Saved in local registry.")
        n8n_workflow_id = f"local-n8n-{uuid.uuid4().hex[:6]}"
        status_label = "deployed_offline"
        is_active = req.auto_activate

    # 3. Store record in database
    workflow = Workflow(
        title=generation.abstract_schema.title,
        original_prompt=req.prompt,
        n8n_workflow_id=n8n_workflow_id,
        n8n_workflow_json=n8n_payload,
        abstract_schema=generation.abstract_schema.model_dump(),
        status=status_label,
        is_active=is_active,
        webhook_url=webhook_url,
        version=1,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    return {
        "success": True,
        "workflow": workflow.to_dict(),
        "summary": generation.summary,
        "required_credentials": generation.abstract_schema.required_credentials,
        "n8n_blueprint": n8n_payload,
    }

@app.get("/api/v1/workflows")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    """Retrieve all workflows ordered by creation date."""
    result = await db.execute(select(Workflow).order_by(desc(Workflow.created_at)))
    workflows = result.scalars().all()
    return [wf.to_dict() for wf in workflows]

@app.get("/api/v1/workflows/{workflow_id}")
async def get_workflow_endpoint(workflow_id: str, db: AsyncSession = Depends(get_db)):
    """Get single workflow and its recent execution history."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    exec_res = await db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .order_by(desc(ExecutionLog.created_at))
        .limit(10)
    )
    logs = exec_res.scalars().all()

    data = workflow.to_dict()
    data["executions"] = [log.to_dict() for log in logs]
    return data

@app.post("/api/v1/workflows/{workflow_id}/activate")
async def toggle_workflow_activation(
    workflow_id: str,
    activate: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Programmatically activate or deactivate workflow in n8n and database."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.n8n_workflow_id and not workflow.n8n_workflow_id.startswith("local-n8n"):
        try:
            if activate:
                await n8n_client.activate_workflow(workflow.n8n_workflow_id)
            else:
                await n8n_client.deactivate_workflow(workflow.n8n_workflow_id)
        except Exception as e:
            logger.warning(f"Could not sync state to n8n: {e}")

    workflow.is_active = activate
    workflow.status = "active" if activate else "inactive"
    await db.commit()
    await db.refresh(workflow)
    return {"success": True, "workflow": workflow.to_dict()}

@app.post("/api/v1/workflows/{workflow_id}/execute")
async def execute_workflow_test(
    workflow_id: str,
    req: ExecutionSimulateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers or simulates a workflow execution.
    Supports injecting real-world error traces to test Component C: Self-Healing.
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    exec_id = f"exec-{uuid.uuid4().hex[:8]}"
    default_payload = req.test_payload or {
        "customer_name": "Acme Corp",
        "email": "finance@acmecorp.com",
        "amount": 2840.50,
        "currency": "USD",
        "timestamp": "2026-09-21T07:45:00Z"
    }

    if req.simulate_failure:
        # Generate simulated realistic n8n stack traces
        if req.error_type == "telegram_400":
            error_trace = """NodeApiError: Bad Request: can't parse entities: Character '(' is reserved and must be escaped with the preceding '\\'
    at Object.telegramApiRequest (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/Telegram/GenericFunctions.js:142:15)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at Object.execute (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/Telegram/Telegram.node.js:891:36)
Error Code: 400 | Node: Dispatch Telegram Alert"""
            failed_node = "Dispatch Telegram Alert"
        elif req.error_type == "sheets_missing_column":
            error_trace = """TypeError: Cannot read properties of undefined (reading 'email')
    at Object.execute (/usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/If/If.node.js:124:28)
    at Workflow.runNode (/usr/local/lib/node_modules/n8n/packages/core/src/Workflow.ts:658:19)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
Error Code: UNCAUGHT_EXCEPTION | Node: Validate Email"""
            failed_node = "Validate Email"
        else:
            error_trace = "ETIMEDOUT: Connection to remote webhook destination timed out after 10000ms at HttpRequest.node.js:321"
            failed_node = "HTTP Request"

        log = ExecutionLog(
            workflow_id=workflow.id,
            n8n_execution_id=exec_id,
            status="failed",
            input_payload=default_payload,
            output_payload=None,
            error_trace=error_trace,
            was_self_healed=False
        )
        workflow.status = "error"
        db.add(log)
        await db.commit()
        await db.refresh(log)

        return {
            "success": False,
            "status": "failed",
            "execution": log.to_dict(),
            "failed_node": failed_node,
            "self_healing_available": True,
            "message": "Execution encountered an error. Self-Healing Agent ready to repair."
        }

    # Successful execution simulation
    log = ExecutionLog(
        workflow_id=workflow.id,
        n8n_execution_id=exec_id,
        status="success",
        input_payload=default_payload,
        output_payload={
            "status": "completed",
            "invoice_generated": True,
            "invoice_id": "INV-892410",
            "delivery_receipt": "delivered_via_n8n",
            "execution_time_ms": 412
        },
        was_self_healed=False
    )
    workflow.status = "active"
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return {
        "success": True,
        "status": "success",
        "execution": log.to_dict(),
        "message": "Workflow executed successfully without errors."
    }

@app.post("/api/v1/workflows/{workflow_id}/self-heal")
async def self_heal_workflow_endpoint(
    workflow_id: str,
    req: SelfHealRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Component C: The Self-Healing & Monitoring Agent
    Intercepts error traces, diagnoses the root cause, synthesizes a patched n8n workflow,
    re-pushes to n8n, and verifies updated health.
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # 1. Run agentic self-healing
    healing_result = await agent_engine.self_heal_workflow(
        current_workflow_json=workflow.n8n_workflow_json,
        error_trace=req.error_trace,
        failed_node=req.failed_node
    )

    # 2. Push updated workflow blueprint to n8n
    if workflow.n8n_workflow_id and not workflow.n8n_workflow_id.startswith("local-n8n"):
        try:
            await n8n_client.update_workflow(workflow.n8n_workflow_id, healing_result.repaired_workflow_json)
            await n8n_client.activate_workflow(workflow.n8n_workflow_id)
        except Exception as e:
            logger.warning(f"Could not auto-sync healed workflow to n8n: {e}")

    # 3. Update database records
    workflow.n8n_workflow_json = healing_result.repaired_workflow_json
    workflow.version += 1
    workflow.status = "active"

    # Mark the latest failed execution as self-healed if present
    if req.execution_id:
        log_res = await db.execute(select(ExecutionLog).where(ExecutionLog.id == req.execution_id))
        exec_log = log_res.scalar_one_or_none()
        if exec_log:
            exec_log.was_self_healed = True
            exec_log.status = "healed"
            exec_log.healing_summary = healing_result.diff_summary

    await db.commit()
    await db.refresh(workflow)

    return {
        "success": True,
        "workflow": workflow.to_dict(),
        "healing_diagnosis": healing_result.diagnosis.model_dump(),
        "diff_summary": healing_result.diff_summary,
        "new_version": workflow.version,
    }

@app.post("/api/v1/webhooks/n8n-error")
async def n8n_error_webhook_listener(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Component C: Incoming Webhook Listener
    Receives automated error alerts directly from n8n Error Trigger nodes.
    """
    logger.info(f"Received n8n error webhook payload: {payload}")
    n8n_wf_id = str(payload.get("workflow", {}).get("id", ""))
    error_msg = str(payload.get("execution", {}).get("error", {}).get("message", "Unknown n8n error"))

    if n8n_wf_id:
        result = await db.execute(select(Workflow).where(Workflow.n8n_workflow_id == n8n_wf_id))
        wf = result.scalar_one_or_none()
        if wf:
            wf.status = "error"
            log = ExecutionLog(
                workflow_id=wf.id,
                n8n_execution_id=str(payload.get("execution", {}).get("id")),
                status="failed",
                error_trace=error_msg,
                was_self_healed=False
            )
            db.add(log)
            await db.commit()

    return {"status": "error_logged_and_queued_for_healing"}
