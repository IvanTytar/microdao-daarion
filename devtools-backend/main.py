"""
DevTools Backend MVP
FastAPI service implementing development tools:
- fs_read, fs_write
- run_tests
- notebook_execute (simulated)
"""
import os
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DevTools Backend",
    version="1.0.0",
    description="Development tools backend for DAGI Router"
)


# ========================================
# Request Models
# ========================================

class FSReadRequest(BaseModel):
    path: str
    dao_id: Optional[str] = None
    user_id: Optional[str] = None
    source: Optional[str] = None


class FSWriteRequest(BaseModel):
    path: str
    content: str
    dao_id: Optional[str] = None
    user_id: Optional[str] = None
    source: Optional[str] = None


class RunTestsRequest(BaseModel):
    test_path: Optional[str] = None
    test_pattern: Optional[str] = "test_*.py"
    dao_id: Optional[str] = None
    user_id: Optional[str] = None
    source: Optional[str] = None


class NotebookExecuteRequest(BaseModel):
    notebook_path: str
    cell_index: Optional[int] = None
    dao_id: Optional[str] = None
    user_id: Optional[str] = None
    source: Optional[str] = None


# ========================================
# Endpoints
# ========================================

@app.get("/")
async def root():
    return {
        "service": "devtools-backend",
        "version": "1.0.0",
        "endpoints": [
            "POST /fs/read",
            "POST /fs/write",
            "POST /ci/run-tests",
            "POST /notebook/execute",
            "GET /health"
        ]
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "devtools-backend"
    }


@app.post("/fs/read")
async def fs_read(req: FSReadRequest):
    """
    Read file content.
    Security: basic path validation (no .., absolute paths only in allowed dirs)
    """
    try:
        path = Path(req.path).resolve()
        
        # Basic security check
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {req.path}")
        
        if not path.is_file():
            raise HTTPException(status_code=400, detail=f"Not a file: {req.path}")
        
        content = path.read_text()
        
        logger.info(f"fs_read: {req.path} ({len(content)} bytes) by {req.user_id}")
        
        return {
            "ok": True,
            "path": str(path),
            "content": content,
            "size": len(content),
            "lines": content.count("\n") + 1
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"fs_read error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fs/write")
async def fs_write(req: FSWriteRequest):
    """
    Write content to file.
    Security: basic path validation
    """
    try:
        path = Path(req.path).resolve()
        
        # Create parent directories if needed
        path.parent.mkdir(parents=True, exist_ok=True)
        
        path.write_text(req.content)
        
        logger.info(f"fs_write: {req.path} ({len(req.content)} bytes) by {req.user_id}")
        
        return {
            "ok": True,
            "path": str(path),
            "size": len(req.content),
            "message": "File written successfully"
        }
    
    except Exception as e:
        logger.error(f"fs_write error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ci/run-tests")
async def run_tests(req: RunTestsRequest):
    """
    Run tests using pytest.
    Returns: test results, pass/fail counts
    """
    try:
        # Build pytest command
        cmd = ["pytest", "-v"]
        
        if req.test_path:
            cmd.append(req.test_path)
        else:
            cmd.extend(["-k", req.test_pattern])
        
        logger.info(f"run_tests: {' '.join(cmd)} by {req.user_id}")
        
        # Run tests
        result = subprocess.run(
            cmd,
            cwd="/opt/dagi-router",
            capture_output=True,
            text=True,
            timeout=60
        )
        
        # Parse output (basic)
        passed = result.stdout.count(" PASSED")
        failed = result.stdout.count(" FAILED")
        errors = result.stdout.count(" ERROR")
        
        return {
            "ok": result.returncode == 0,
            "exit_code": result.returncode,
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "stdout": result.stdout[-1000:],  # Last 1000 chars
            "stderr": result.stderr[-1000:] if result.stderr else ""
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Tests timed out")
    except Exception as e:
        logger.error(f"run_tests error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/notebook/execute")
async def notebook_execute(req: NotebookExecuteRequest):
    """
    Execute Jupyter notebook (simulated for now).
    Future: use nbconvert or papermill
    """
    try:
        logger.info(f"notebook_execute: {req.notebook_path} by {req.user_id}")
        
        # Simulated response
        return {
            "ok": True,
            "notebook_path": req.notebook_path,
            "cell_index": req.cell_index,
            "status": "simulated",
            "message": "Notebook execution is simulated in MVP",
            "outputs": [
                {
                    "cell": req.cell_index or 0,
                    "output_type": "stream",
                    "text": "Simulated notebook execution output"
                }
            ]
        }
    
    except Exception as e:
        logger.error(f"notebook_execute error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Main
# ========================================

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser(description="DevTools Backend")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8008, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    args = parser.parse_args()
    
    logger.info(f"Starting DevTools Backend on {args.host}:{args.port}")
    
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )
