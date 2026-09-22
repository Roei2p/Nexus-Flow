import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    original_prompt = Column(Text, nullable=False)
    
    # n8n specifics
    n8n_workflow_id = Column(String(100), nullable=True, index=True)
    n8n_workflow_json = Column(JSON, nullable=False)
    abstract_schema = Column(JSON, nullable=False)
    
    # State & lifecycle
    status = Column(String(50), default="deployed", index=True) # draft, deployed, active, error, self_healing
    is_active = Column(Boolean, default=True)
    webhook_url = Column(String(500), nullable=True)
    version = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="workflows")
    execution_logs = relationship(
        "ExecutionLog", 
        back_populates="workflow", 
        cascade="all, delete-orphan",
        order_by="desc(ExecutionLog.created_at)"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "original_prompt": self.original_prompt,
            "n8n_workflow_id": self.n8n_workflow_id,
            "n8n_workflow_json": self.n8n_workflow_json,
            "abstract_schema": self.abstract_schema,
            "status": self.status,
            "is_active": self.is_active,
            "webhook_url": self.webhook_url,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflows.id"), nullable=False, index=True)
    n8n_execution_id = Column(String(100), nullable=True, index=True)
    
    # Execution metrics
    status = Column(String(50), nullable=False) # success, failed, running, healed
    input_payload = Column(JSON, nullable=True)
    output_payload = Column(JSON, nullable=True)
    error_trace = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    was_self_healed = Column(Boolean, default=False)
    healing_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    workflow = relationship("Workflow", back_populates="execution_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "n8n_execution_id": self.n8n_execution_id,
            "status": self.status,
            "input_payload": self.input_payload,
            "output_payload": self.output_payload,
            "error_trace": self.error_trace,
            "retry_count": self.retry_count,
            "was_self_healed": self.was_self_healed,
            "healing_summary": self.healing_summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
