import os
import logging
from typing import Dict, Any, Optional, List
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("nexus_flow.n8n_service")

class N8nServiceError(Exception):
    """Custom exception raised when an interaction with the n8n API fails."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[Any] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body

class N8nService:
    """
    Client wrapper for communicating with a local or remote n8n REST API.
    Handles workflow creation, updating, activation, and execution telemetry monitoring.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        webhook_base_url: Optional[str] = None,
        timeout: float = 15.0,
    ):
        self.base_url = (base_url or os.getenv("N8N_BASE_URL", "http://localhost:5678")).rstrip("/")
        self.api_key = api_key or os.getenv("N8N_API_KEY", "")
        self.webhook_base_url = (
            webhook_base_url or os.getenv("N8N_WEBHOOK_URL", f"{self.base_url}/webhook")
        ).rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["X-N8N-API-KEY"] = self.api_key
        return headers

    async def check_health(self) -> Dict[str, Any]:
        """Verify connectivity to the n8n instance."""
        try:
            url = f"{self.base_url}/healthz"
            response = await self.client.get(url, headers=self._get_headers())
            if response.status_code == 200:
                return {"connected": True, "status": "ok", "url": self.base_url}
        except httpx.RequestError as e:
            logger.warning(f"Could not connect to n8n at {self.base_url}: {e}")
        return {"connected": False, "status": "unreachable", "url": self.base_url}

    async def create_workflow(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new workflow in the n8n instance.
        Endpoint: POST /api/v1/workflows
        """
        url = f"{self.base_url}/api/v1/workflows"
        
        # Ensure proper payload structure for n8n API v1
        payload = {
            "name": workflow_data.get("name", "Untitled Workflow"),
            "nodes": workflow_data.get("nodes", []),
            "connections": workflow_data.get("connections", {}),
            "settings": workflow_data.get("settings", {"executionOrder": "v1"}),
        }

        try:
            response = await self.client.post(url, json=payload, headers=self._get_headers())
            if response.status_code in (200, 201):
                result = response.json()
                logger.info(f"Successfully created n8n workflow {result.get('id')}")
                return result
            
            error_body = response.text
            raise N8nServiceError(
                f"n8n workflow creation failed with status {response.status_code}: {error_body}",
                status_code=response.status_code,
                response_body=error_body,
            )
        except httpx.RequestError as exc:
            logger.error(f"Network error communicating with n8n at {url}: {exc}")
            raise N8nServiceError(f"Failed to communicate with n8n instance at {self.base_url}: {str(exc)}")

    async def update_workflow(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates an existing workflow in n8n.
        Endpoint: PUT /api/v1/workflows/{workflow_id}
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
        payload = {
            "name": workflow_data.get("name"),
            "nodes": workflow_data.get("nodes", []),
            "connections": workflow_data.get("connections", {}),
            "settings": workflow_data.get("settings", {}),
        }

        try:
            response = await self.client.put(url, json=payload, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            raise N8nServiceError(
                f"n8n update failed with status {response.status_code}: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Failed to update workflow {workflow_id}: {str(exc)}")

    async def activate_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Activates a workflow in n8n so triggers and webhooks listen for incoming events.
        Endpoint: POST /api/v1/workflows/{workflow_id}/activate
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/activate"
        try:
            response = await self.client.post(url, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            raise N8nServiceError(
                f"n8n activation failed for {workflow_id}: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Failed to activate workflow {workflow_id}: {str(exc)}")

    async def deactivate_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Deactivates a workflow in n8n.
        Endpoint: POST /api/v1/workflows/{workflow_id}/deactivate
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}/deactivate"
        try:
            response = await self.client.post(url, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            raise N8nServiceError(
                f"n8n deactivation failed for {workflow_id}: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Failed to deactivate workflow {workflow_id}: {str(exc)}")

    async def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Retrieves the workflow JSON blueprint from n8n.
        Endpoint: GET /api/v1/workflows/{workflow_id}
        """
        url = f"{self.base_url}/api/v1/workflows/{workflow_id}"
        try:
            response = await self.client.get(url, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            raise N8nServiceError(
                f"Failed to fetch workflow {workflow_id}: {response.text}",
                status_code=response.status_code,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Network error fetching workflow {workflow_id}: {str(exc)}")

    async def get_workflow_executions(self, workflow_id: str, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fetches execution history, status metrics, and potential errors for a specific workflow.
        Endpoint: GET /api/v1/executions?workflowId={workflow_id}&limit={limit}
        """
        url = f"{self.base_url}/api/v1/executions"
        params = {"workflowId": workflow_id, "limit": limit}
        try:
            response = await self.client.get(url, params=params, headers=self._get_headers())
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            raise N8nServiceError(
                f"Failed to fetch executions for {workflow_id}: {response.text}",
                status_code=response.status_code,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Network error fetching executions: {str(exc)}")

    async def get_execution_detail(self, execution_id: str) -> Dict[str, Any]:
        """
        Fetches deep execution data including node error stack traces for the Self-Healing agent.
        Endpoint: GET /api/v1/executions/{execution_id}
        """
        url = f"{self.base_url}/api/v1/executions/{execution_id}"
        try:
            response = await self.client.get(url, headers=self._get_headers())
            if response.status_code == 200:
                return response.json()
            raise N8nServiceError(
                f"Failed to fetch execution detail for {execution_id}: {response.text}",
                status_code=response.status_code,
            )
        except httpx.RequestError as exc:
            raise N8nServiceError(f"Network error fetching execution {execution_id}: {str(exc)}")

    def extract_webhook_url(self, workflow_json: Dict[str, Any]) -> Optional[str]:
        """
        Scans nodes for an n8n webhook trigger node and constructs the external trigger URL.
        """
        nodes = workflow_json.get("nodes", [])
        for node in nodes:
            node_type = node.get("type", "")
            if "webhook" in node_type.lower():
                parameters = node.get("parameters", {})
                path = parameters.get("path", "")
                if path:
                    # Clean up leading slashes
                    clean_path = path.lstrip("/")
                    return f"{self.webhook_base_url}/{clean_path}"
        return None

    async def close(self):
        """Clean up the HTTP client resources."""
        await self.client.aclose()
