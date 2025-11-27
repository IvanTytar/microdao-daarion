from models import MessageCreatedEvent, FilterContext, FilterDecision
from datetime import datetime, time
import yaml
import os

class FilterRules:
    def __init__(self, config_path: str = "config.yaml"):
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                self.config = yaml.safe_load(f)
        else:
            # Default config
            self.config = {
                'rules': {
                    'quiet_hours': {
                        'start': '23:00',
                        'end': '07:00'
                    },
                    'default_agents': {
                        'microdao:daarion': 'agent:sofia',
                        'microdao:7': 'agent:sofia'
                    }
                }
            }
        
        self.quiet_hours_start = datetime.strptime(
            self.config['rules']['quiet_hours']['start'], 
            "%H:%M"
        ).time()
        self.quiet_hours_end = datetime.strptime(
            self.config['rules']['quiet_hours']['end'], 
            "%H:%M"
        ).time()
        self.default_agents = self.config['rules'].get('default_agents', {})
    
    def is_quiet_hours(self, dt: datetime) -> bool:
        """Check if current time is in quiet hours"""
        current_time = dt.time()
        if self.quiet_hours_start > self.quiet_hours_end:
            # Overnight range (e.g., 23:00 - 07:00)
            return current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end
        else:
            return self.quiet_hours_start <= current_time <= self.quiet_hours_end
    
    def decide(self, event: MessageCreatedEvent, ctx: FilterContext) -> FilterDecision:
        """
        Apply filtering rules and decide if/which agent should respond
        
        Rules:
        1. Block agent→agent loops
        2. Check if agent is disabled
        3. Find target agent (from allowed_agents or default)
        4. Apply quiet hours modifier
        5. Allow or deny
        """
        base_decision = FilterDecision(
            channel_id=event.channel_id,
            message_id=event.message_id,
            matrix_event_id=event.matrix_event_id,
            microdao_id=event.microdao_id,
            decision="deny"
        )
        
        # Rule 1: Block agent→agent loops
        if event.sender_type == "agent":
            print(f"[FILTER] Denying: sender is agent (loop prevention)")
            return base_decision
        
        # Rule 2: Check if any agents are disabled
        if ctx.channel.disabled_agents:
            print(f"[FILTER] Warning: Some agents are disabled: {ctx.channel.disabled_agents}")
        
        # Rule 3: Find target agent
        target_agent_id = None
        if ctx.channel.allowed_agents:
            target_agent_id = ctx.channel.allowed_agents[0]
            print(f"[FILTER] Target agent from allowed_agents: {target_agent_id}")
        elif event.microdao_id in self.default_agents:
            target_agent_id = self.default_agents[event.microdao_id]
            print(f"[FILTER] Target agent from default: {target_agent_id}")
        
        if not target_agent_id:
            print(f"[FILTER] Denying: no target agent found for {event.microdao_id}")
            return base_decision
        
        # Check if target agent is disabled
        if target_agent_id in ctx.channel.disabled_agents:
            print(f"[FILTER] Denying: target agent {target_agent_id} is disabled")
            return base_decision
        
        # Rule 4: Check quiet hours
        if ctx.local_time and self.is_quiet_hours(ctx.local_time):
            print(f"[FILTER] Quiet hours active, modifying prompt")
            return FilterDecision(
                channel_id=event.channel_id,
                message_id=event.message_id,
                matrix_event_id=event.matrix_event_id,
                microdao_id=event.microdao_id,
                decision="modify",
                target_agent_id=target_agent_id,
                rewrite_prompt="Відповідай стисло і тільки якщо запит важливий. Не ініціюй розмову сам."
            )
        
        # Rule 5: Allow
        print(f"[FILTER] Allowing: {target_agent_id} to respond")
        return FilterDecision(
            channel_id=event.channel_id,
            message_id=event.message_id,
            matrix_event_id=event.matrix_event_id,
            microdao_id=event.microdao_id,
            decision="allow",
            target_agent_id=target_agent_id
        )





