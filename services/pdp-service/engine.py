"""
Policy Decision Engine

Evaluates access control policies based on actor, action, and resource
"""
from models import PolicyRequest, PolicyDecision, ActorType, Action, ResourceType
from policy_store import PolicyStore

def evaluate(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """
    Evaluate policy request and return decision
    
    Priority:
    1. System admin bypass (careful!)
    2. Service-to-service (trusted services)
    3. Resource-specific rules
    4. Default deny
    """
    
    # 1. System Admin bypass (use carefully)
    if "system_admin" in request.actor.roles:
        if request.action == Action.ADMIN:
            return PolicyDecision(
                effect="permit",
                reason="system_admin_role"
            )
    
    # 2. Service-to-service communication
    if request.actor.actor_type == ActorType.SERVICE:
        # Services can generally access other services (internal trust)
        if request.action in [Action.READ, Action.WRITE]:
            return PolicyDecision(
                effect="permit",
                reason="trusted_service"
            )
    
    # 3. Resource-specific rules
    if request.resource.type == ResourceType.MICRODAO:
        return evaluate_microdao_access(request, policy_store)
    
    elif request.resource.type == ResourceType.CHANNEL:
        return evaluate_channel_access(request, policy_store)
    
    elif request.resource.type == ResourceType.TOOL:
        return evaluate_tool_access(request, policy_store)
    
    elif request.resource.type == ResourceType.AGENT:
        return evaluate_agent_access(request, policy_store)
    
    elif request.resource.type == ResourceType.USAGE:
        return evaluate_usage_access(request, policy_store)
    
    # 4. Default deny
    return PolicyDecision(
        effect="deny",
        reason="no_matching_policy"
    )

def evaluate_microdao_access(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """Evaluate microDAO access"""
    microdao_id = request.resource.id
    
    # Check if actor is owner
    if policy_store.is_microdao_owner(request.actor.actor_id, microdao_id):
        # Owners can do anything
        return PolicyDecision(effect="permit", reason="microdao_owner")
    
    # Check if actor is admin
    if policy_store.is_microdao_admin(request.actor.actor_id, microdao_id):
        # Admins can READ, WRITE, INVITE
        if request.action in [Action.READ, Action.WRITE, Action.INVITE]:
            return PolicyDecision(effect="permit", reason="microdao_admin")
        return PolicyDecision(effect="deny", reason="admin_cannot_manage")
    
    # Check if actor is member
    if microdao_id in request.actor.microdao_ids or "member" in request.actor.roles:
        # Members can READ
        if request.action == Action.READ:
            return PolicyDecision(effect="permit", reason="microdao_member")
    
    return PolicyDecision(effect="deny", reason="not_microdao_member")

def evaluate_channel_access(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """Evaluate channel access"""
    channel_id = request.resource.id
    
    # Get channel policy
    channel_policy = policy_store.get_channel_policy(channel_id)
    if not channel_policy:
        return PolicyDecision(effect="deny", reason="channel_not_found")
    
    microdao_id = channel_policy.get("microdao_id")
    
    # Check if actor is blocked
    if policy_store.is_blocked_in_channel(request.actor.actor_id, channel_id):
        return PolicyDecision(effect="deny", reason="blocked_in_channel")
    
    # Check if actor is microDAO member
    if microdao_id and microdao_id not in request.actor.microdao_ids:
        return PolicyDecision(effect="deny", reason="not_microdao_member")
    
    # Check if actor has required role
    allowed_roles = channel_policy.get("allowed_roles", ["member"])
    actor_has_role = any(role in request.actor.roles for role in allowed_roles)
    
    if not actor_has_role:
        return PolicyDecision(effect="deny", reason="insufficient_role")
    
    # SEND_MESSAGE: additional checks
    if request.action == Action.SEND_MESSAGE:
        # Check message rate limit (from context)
        context = request.context or {}
        if context.get("rate_limited"):
            return PolicyDecision(effect="deny", reason="rate_limited")
        
        return PolicyDecision(effect="permit", reason="channel_member")
    
    # READ: allow if member
    if request.action == Action.READ:
        return PolicyDecision(effect="permit", reason="channel_member")
    
    # MANAGE: only for admins/owners
    if request.action == Action.MANAGE:
        if policy_store.is_microdao_admin(request.actor.actor_id, microdao_id):
            return PolicyDecision(effect="permit", reason="channel_admin")
        return PolicyDecision(effect="deny", reason="not_channel_admin")
    
    return PolicyDecision(effect="deny", reason="action_not_allowed")

def evaluate_tool_access(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """Evaluate tool execution access"""
    tool_id = request.resource.id
    
    # Get tool policy
    tool_policy = policy_store.get_tool_policy(tool_id)
    if not tool_policy:
        return PolicyDecision(effect="deny", reason="tool_not_found")
    
    # Check if tool is enabled
    if not tool_policy.get("enabled", True):
        return PolicyDecision(effect="deny", reason="tool_disabled")
    
    # Check if actor is in allowed list
    allowed_agents = tool_policy.get("allowed_agents")
    
    # None = all agents allowed
    if allowed_agents is None:
        return PolicyDecision(effect="permit", reason="tool_public")
    
    # Check specific allowlist
    if request.actor.actor_id in allowed_agents:
        return PolicyDecision(effect="permit", reason="tool_allowed_agent")
    
    # Check if user has required role
    allowed_user_roles = tool_policy.get("allowed_user_roles", [])
    if allowed_user_roles:
        if any(role in request.actor.roles for role in allowed_user_roles):
            return PolicyDecision(effect="permit", reason="tool_allowed_role")
    
    return PolicyDecision(effect="deny", reason="tool_not_allowed")

def evaluate_agent_access(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """Evaluate agent management access"""
    agent_id = request.resource.id
    
    # Get agent policy
    agent_policy = policy_store.get_agent_policy(agent_id)
    if not agent_policy:
        return PolicyDecision(effect="deny", reason="agent_not_found")
    
    # Check if actor owns the agent
    if agent_policy.get("owner_id") == request.actor.actor_id:
        return PolicyDecision(effect="permit", reason="agent_owner")
    
    # Check if actor is microDAO admin
    agent_microdao = agent_policy.get("microdao_id")
    if agent_microdao and policy_store.is_microdao_admin(request.actor.actor_id, agent_microdao):
        return PolicyDecision(effect="permit", reason="microdao_admin")
    
    # READ: allow if in same microDAO
    if request.action == Action.READ:
        if agent_microdao in request.actor.microdao_ids:
            return PolicyDecision(effect="permit", reason="same_microdao")
    
    return PolicyDecision(effect="deny", reason="not_agent_owner")

def evaluate_usage_access(request: PolicyRequest, policy_store: PolicyStore) -> PolicyDecision:
    """Evaluate usage/billing data access"""
    resource_id = request.resource.id  # microdao_id or actor_id
    
    # Actors can view their own usage
    if resource_id == request.actor.actor_id:
        return PolicyDecision(effect="permit", reason="own_usage")
    
    # microDAO admins can view microDAO usage
    if policy_store.is_microdao_admin(request.actor.actor_id, resource_id):
        return PolicyDecision(effect="permit", reason="microdao_admin")
    
    # System admins can view all
    if "system_admin" in request.actor.roles:
        return PolicyDecision(effect="permit", reason="system_admin")
    
    return PolicyDecision(effect="deny", reason="not_authorized")




