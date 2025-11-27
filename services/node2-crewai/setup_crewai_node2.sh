#!/bin/bash
# Setup CrewAI for microDAO Node-2
# CrewAI will be used for agent team formation and orchestration

set -e

echo "🚀 Setting up CrewAI for microDAO Node-2"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if CrewAI service exists on Node-1
CREWAI_CONTAINER="dagi-crewai"
if docker ps --format "{{.Names}}" | grep -q "^${CREWAI_CONTAINER}$"; then
    echo -e "${GREEN}✅ CrewAI container found: ${CREWAI_CONTAINER}${NC}"
    CREWAI_URL="http://localhost:9010"
else
    echo -e "${YELLOW}⚠️  CrewAI container not found. Will set up local CrewAI.${NC}"
    CREWAI_URL="http://localhost:9010"
fi

# Create CrewAI directory for Node-2
CREWAI_DIR="$HOME/node2/crewai"
mkdir -p "$CREWAI_DIR"/{agents,crews,tasks,tools,config}

echo -e "${GREEN}✅ Created CrewAI directory: ${CREWAI_DIR}${NC}"

# Create CrewAI configuration for Node-2
cat > "$CREWAI_DIR/config/node2_crewai_config.yaml" << 'EOF'
# CrewAI Configuration for microDAO Node-2

microdao_id: "microdao-node2"

# LLM Provider (via Swoper/Ollama)
llm:
  provider: "ollama"
  base_url: "http://localhost:11434"
  models:
    default: "deepseek-r1"  # Will be configured based on available models
    code: "qwen2.5-coder:72b"
    math: "deepseek-math:33b"
    vision: "qwen2-vl:32b"
  
# Memory (via RAG Router)
memory:
  rag_router_url: "http://localhost:9401"
  qdrant_url: "http://localhost:6333"
  milvus_url: "http://localhost:19530"
  neo4j_url: "http://localhost:7474"

# Agent Team Structure
agent_teams:
  system:
    description: "System agents for coordination and monitoring"
    agents: []
  
  specialists:
    description: "Specialist agents for specific tasks"
    agents: []
  
  custom:
    description: "Custom agents created by user"
    agents: []

# Crew Formation
crews:
  default:
    name: "microdao-node2-default-crew"
    description: "Default crew for microDAO Node-2"
    agents: []
    tasks: []
    verbose: true
    memory: true

# Tools
tools:
  enabled:
    - web_search
    - code_execution
    - file_operations
    - memory_operations
  
  custom_tools_path: "~/node2/crewai/tools"

# Logging
logging:
  level: "INFO"
  file: "~/node2/crewai/logs/crewai.log"
EOF

echo -e "${GREEN}✅ Created CrewAI configuration${NC}"

# Create requirements file
cat > "$CREWAI_DIR/requirements.txt" << 'EOF'
crewai>=0.28.0
crewai-tools>=0.1.0
langchain>=0.1.0
langchain-community>=0.0.20
pydantic>=2.0.0
pyyaml>=6.0.1
httpx>=0.25.0
EOF

echo -e "${GREEN}✅ Created requirements.txt${NC}"

# Create example agent template
cat > "$CREWAI_DIR/agents/example_agent.py" << 'PYEOF'
"""
Example Agent Template for microDAO Node-2
This is a template for creating agents with CrewAI
"""

from crewai import Agent
from crewai_tools import tool

# Example tool
@tool("Local Memory Search")
def local_memory_search(query: str) -> str:
    """
    Search in local memory (Qdrant/Milvus/Neo4j) via RAG Router.
    
    Args:
        query: Search query
        
    Returns:
        Search results from local memory
    """
    import httpx
    
    rag_router_url = "http://localhost:9401"
    
    try:
        response = httpx.post(
            f"{rag_router_url}/query",
            json={
                "query": query,
                "query_type": "vector_search",
                "limit": 10
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            results = response.json()
            return f"Found {results.get('count', 0)} results: {results.get('results', [])}"
        else:
            return f"Error: {response.status_code}"
    except Exception as e:
        return f"Error searching memory: {e}"

# Example agent
example_agent = Agent(
    role="Example Agent",
    goal="Help with tasks using local memory and LLM",
    backstory="You are an agent in microDAO Node-2, with access to local memory and LLM inference.",
    tools=[local_memory_search],
    verbose=True,
    allow_delegation=False
)

if __name__ == "__main__":
    print("Example agent created successfully!")
PYEOF

echo -e "${GREEN}✅ Created example agent template${NC}"

# Create crew template
cat > "$CREWAI_DIR/crews/example_crew.py" << 'PYEOF'
"""
Example Crew Template for microDAO Node-2
This is a template for creating crews with CrewAI
"""

from crewai import Crew, Process
from agents.example_agent import example_agent
from crewai import Task

# Example task
example_task = Task(
    description="Example task for microDAO Node-2",
    agent=example_agent,
    expected_output="Task completion result"
)

# Example crew
example_crew = Crew(
    agents=[example_agent],
    tasks=[example_task],
    process=Process.sequential,
    verbose=True,
    memory=True
)

if __name__ == "__main__":
    result = example_crew.kickoff()
    print(f"Result: {result}")
PYEOF

echo -e "${GREEN}✅ Created example crew template${NC}"

# Create setup script
cat > "$CREWAI_DIR/setup.sh" << 'EOF'
#!/bin/bash
# Setup CrewAI environment for Node-2

echo "Setting up CrewAI for microDAO Node-2..."

# Install dependencies
pip install -r requirements.txt

# Create virtual environment (optional)
# python -m venv venv
# source venv/bin/activate
# pip install -r requirements.txt

echo "✅ CrewAI setup complete!"
echo ""
echo "Next steps:"
echo "  1. Create your agents in agents/"
echo "  2. Create your crews in crews/"
echo "  3. Run: python crews/your_crew.py"
EOF

chmod +x "$CREWAI_DIR/setup.sh"

echo -e "${GREEN}✅ Created setup script${NC}"

echo -e "\n${GREEN}=================================================="
echo "✅ CrewAI Setup Complete"
echo "==================================================${NC}"
echo ""
echo "📁 CrewAI directory: ${CREWAI_DIR}"
echo "📝 Configuration: ${CREWAI_DIR}/config/node2_crewai_config.yaml"
echo ""
echo "⏭️  Next steps:"
echo "   1. Install dependencies: cd ${CREWAI_DIR} && pip install -r requirements.txt"
echo "   2. Create your agents (you'll provide list later)"
echo "   3. Create crews with your agents"
echo "   4. Run crews for agent team formation"
echo ""



