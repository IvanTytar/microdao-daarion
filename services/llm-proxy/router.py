import yaml
import os
from models import ModelConfig, ProviderConfig
from typing import Dict, Optional

class ModelRouter:
    def __init__(self, config_path: str = "config.yaml"):
        self.models: Dict[str, ModelConfig] = {}
        self.providers: Dict[str, ProviderConfig] = {}
        self._load_config(config_path)
    
    def _load_config(self, config_path: str):
        """Load configuration from YAML"""
        if not os.path.exists(config_path):
            print(f"⚠️  Config file not found: {config_path}, using defaults")
            return
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Load providers
        for name, provider_config in config.get('providers', {}).items():
            api_key = None
            if provider_config.get('api_key_env'):
                api_key = os.getenv(provider_config['api_key_env'])
                if not api_key and name != 'local':
                    print(f"⚠️  No API key found for {name} ({provider_config['api_key_env']})")
            
            self.providers[name] = ProviderConfig(
                name=name,
                base_url=provider_config['base_url'],
                api_key=api_key,
                timeout=provider_config.get('timeout', 30),
                max_retries=provider_config.get('max_retries', 2)
            )
            print(f"✅ Loaded provider: {name}")
        
        # Load models
        for logical_name, model_config in config.get('models', {}).items():
            self.models[logical_name] = ModelConfig(
                logical_name=logical_name,
                provider=model_config['provider'],
                physical_name=model_config['physical_name'],
                max_tokens=model_config.get('max_tokens'),
                cost_per_1k_prompt=model_config.get('cost_per_1k_prompt'),
                cost_per_1k_completion=model_config.get('cost_per_1k_completion')
            )
            print(f"✅ Loaded model: {logical_name} → {model_config['provider']}/{model_config['physical_name']}")
    
    def route_model(self, logical_model: str) -> tuple[ModelConfig, ProviderConfig]:
        """
        Route a logical model name to provider config
        
        Returns: (ModelConfig, ProviderConfig)
        Raises: ValueError if model or provider not found
        """
        if logical_model not in self.models:
            raise ValueError(f"Unknown model: {logical_model}. Available: {list(self.models.keys())}")
        
        model_config = self.models[logical_model]
        
        if model_config.provider not in self.providers:
            raise ValueError(f"Provider not configured: {model_config.provider}")
        
        provider_config = self.providers[model_config.provider]
        
        return model_config, provider_config
    
    def get_available_models(self) -> list[str]:
        """Get list of available logical model names"""
        return list(self.models.keys())




