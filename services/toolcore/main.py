"""
DAARION Toolcore Service
Port: 7009
Tool registry and execution engine for agents
"""
import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models import ToolDefinition, ToolCallRequest, ToolCallResult
from registry import ToolRegistry
from executors import HTTPExecutor, PythonExecutor

# ============================================================================
# Global State
# ============================================================================

registry: ToolRegistry | None = None
http_executor: HTTPExecutor | None = None
python_executor: PythonExecutor | None = None

# ============================================================================
# App Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    global registry, http_executor, python_executor
    
    # Startup
    print("🚀 Starting Toolcore service...")
    
    registry = ToolRegistry()
    http_executor = HTTPExecutor()
    python_executor = PythonExecutor()
    
    print(f"✅ Toolcore ready with {len(registry.tools)} tools")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Toolcore...")
    if http_executor:
        await http_executor.close()

app = FastAPI(
    title="DAARION Toolcore",
    version="1.0.0",
    description="Tool registry and execution engine",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/internal/tools")
async def list_tools(
    agent_id: str | None = None,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    List available tools
    
    If agent_id provided, filters by allowed_agents
    """
    expected_secret = os.getenv("TOOLCORE_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    tools = registry.list_tools(agent_id=agent_id)
    
    return {
        "tools": [
            {
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.input_schema,
                "executor": tool.executor
            }
            for tool in tools
        ],
        "total": len(tools)
    }

@app.post("/internal/tools/call", response_model=ToolCallResult)
async def call_tool(
    request: ToolCallRequest,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """
    Execute a tool
    
    Steps:
    1. Check permission (agent → tool)
    2. Get tool definition
    3. Call appropriate executor
    4. Return result
    """
    expected_secret = os.getenv("TOOLCORE_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    # Check permission
    allowed, reason = registry.check_permission(request.tool_id, request.agent_id)
    if not allowed:
        raise HTTPException(403, reason)
    
    # Get tool definition
    tool = registry.get_tool(request.tool_id)
    if not tool:
        raise HTTPException(404, f"Tool not found: {request.tool_id}")
    
    # Log call
    print(f"🔧 Tool call: {request.tool_id} by {request.agent_id}")
    
    # Execute
    try:
        if tool.executor == "http":
            result = await http_executor.execute(
                tool_id=tool.id,
                target=tool.target,
                args=request.args,
                context=request.context or {},
                timeout=tool.timeout
            )
        
        elif tool.executor == "python":
            result = await python_executor.execute(
                tool_id=tool.id,
                target=tool.target,
                args=request.args,
                context=request.context or {},
                timeout=tool.timeout
            )
        
        else:
            raise HTTPException(500, f"Unknown executor: {tool.executor}")
        
        # Log result
        if result.ok:
            print(f"✅ Tool {request.tool_id} succeeded in {result.latency_ms:.0f}ms")
        else:
            print(f"❌ Tool {request.tool_id} failed: {result.error}")
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Tool execution failed: {str(e)}")

@app.get("/internal/tools/{tool_id}")
async def get_tool(
    tool_id: str,
    x_internal_secret: str = Header(None, alias="X-Internal-Secret")
):
    """Get tool definition"""
    expected_secret = os.getenv("TOOLCORE_SECRET", "dev-secret-token")
    if x_internal_secret != expected_secret:
        raise HTTPException(401, "Invalid or missing X-Internal-Secret header")
    
    tool = registry.get_tool(tool_id)
    if not tool:
        raise HTTPException(404, f"Tool not found: {tool_id}")
    
    return tool

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "toolcore",
        "tools": len(registry.tools) if registry else 0
    }

# ============================================================================
# Run
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7009)




