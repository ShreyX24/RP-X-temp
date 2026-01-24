"""
Configuration parser for the simplified step-based YAML format.
"""

import os
import yaml
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class SimpleConfigParser:
    """Handles loading and parsing the simplified step-based YAML configuration."""
    
    def __init__(self, config_path: str):
        """
        Initialize the simple config parser.
        
        Args:
            config_path: Path to the YAML configuration file
        
        Raises:
            FileNotFoundError: If the config file doesn't exist
            ValueError: If the config file is invalid
        """
        self.config_path = config_path
        self.config = self._load_config()
        self._validate_config()
        
        # Extract basic metadata
        self.game_name = self.config.get("metadata", {}).get("game_name", "Unknown Game")
        logger.info(f"SimpleConfigParser initialized for {self.game_name} using {config_path}")
    
    def _load_config(self) -> Dict[str, Any]:
        """
        Load the YAML configuration file.
        
        Returns:
            Parsed configuration as a dictionary
        
        Raises:
            FileNotFoundError: If the config file doesn't exist
            yaml.YAMLError: If the YAML is invalid
        """
        if not os.path.exists(self.config_path):
            logger.error(f"Config file not found: {self.config_path}")
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        
        try:
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            logger.info(f"Loaded configuration from {self.config_path}")
            return config
            
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse YAML config: {str(e)}")
            raise
    
    def _validate_config(self) -> bool:
        """
        Validate the configuration structure.

        Returns:
            True if valid

        Raises:
            ValueError: If the config is invalid
        """
        # Check for required sections
        if "steps" not in self.config:
            logger.error("Missing required 'steps' section in config")
            raise ValueError("Invalid config: missing 'steps' section")

        # Validate steps
        steps = self.config.get("steps", {})
        if not isinstance(steps, dict) or not steps:
            logger.error("Steps section must be a non-empty dictionary")
            raise ValueError("Invalid config: steps section must be a non-empty dictionary")

        # Validate each step
        for step_num, step in steps.items():
            if "description" not in step:
                logger.warning(f"Step {step_num} missing description")

            # Check that step has either:
            # 1. A 'find' section (for steps that need to locate UI elements)
            # 2. An 'action' section without 'find' (for action-only steps like wait, key press)
            has_find = "find" in step
            has_action = "action" in step

            if not has_find and not has_action:
                logger.error(f"Step {step_num} must have either 'find' or 'action' section")
                raise ValueError(f"Invalid step {step_num}: missing 'find' or 'action'")

            # Validate find section if present
            if has_find:
                find_section = step["find"]
                if not isinstance(find_section, dict):
                    logger.error(f"Step {step_num} 'find' must be a dictionary")
                    raise ValueError(f"Invalid step {step_num}: 'find' must be a dictionary")

                # Check for required fields in find section
                if "type" not in find_section and "text" not in find_section:
                    logger.warning(f"Step {step_num} 'find' should have 'type' and/or 'text'")

            # Validate action section if present
            if has_action:
                action_section = step["action"]
                if not isinstance(action_section, dict):
                    logger.error(f"Step {step_num} 'action' must be a dictionary")
                    raise ValueError(f"Invalid step {step_num}: 'action' must be a dictionary")

                # Check for action type
                if "type" not in action_section:
                    logger.error(f"Step {step_num} 'action' must have 'type' field")
                    raise ValueError(f"Invalid step {step_num}: 'action' missing 'type'")

            # Validate sideload if present
            if "sideload" in step:
                self._validate_sideload(step["sideload"], step_num)

            # Validate per-step tracing if present
            if "tracing" in step:
                self._validate_tracing(step["tracing"], step_num)

        # Validate hooks if present
        if "hooks" in self.config:
            self._validate_hooks(self.config["hooks"])

        # Validate game-level tracing if present
        if "metadata" in self.config and "tracing" in self.config["metadata"]:
            self._validate_tracing(self.config["metadata"]["tracing"], "metadata")

        logger.info("Simple configuration validation successful")
        return True

    def _validate_hooks(self, hooks: Dict[str, Any]) -> bool:
        """
        Validate hooks configuration.

        Args:
            hooks: Hooks configuration dictionary

        Raises:
            ValueError: If hooks configuration is invalid
        """
        if not isinstance(hooks, dict):
            raise ValueError("Invalid hooks: must be a dictionary")

        for phase in ["pre", "post"]:
            if phase in hooks:
                phase_hooks = hooks[phase]
                if not isinstance(phase_hooks, list):
                    raise ValueError(f"Invalid hooks.{phase}: must be a list")

                for i, hook in enumerate(phase_hooks):
                    if not isinstance(hook, dict):
                        raise ValueError(f"Invalid hooks.{phase}[{i}]: must be a dictionary")

                    if "path" not in hook:
                        raise ValueError(f"Invalid hooks.{phase}[{i}]: missing 'path'")

                    # Validate optional fields
                    if "args" in hook and not isinstance(hook["args"], list):
                        raise ValueError(f"Invalid hooks.{phase}[{i}]: 'args' must be a list")

                    if "timeout" in hook and not isinstance(hook["timeout"], (int, float)):
                        raise ValueError(f"Invalid hooks.{phase}[{i}]: 'timeout' must be a number")

        logger.debug("Hooks validation successful")
        return True

    def _validate_sideload(self, sideload: Dict[str, Any], step_num: str) -> bool:
        """
        Validate sideload configuration for a step.

        Args:
            sideload: Sideload configuration dictionary
            step_num: Step number for error messages

        Raises:
            ValueError: If sideload configuration is invalid
        """
        if not isinstance(sideload, dict):
            raise ValueError(f"Invalid step {step_num}: sideload must be a dictionary")

        if "path" not in sideload:
            raise ValueError(f"Invalid step {step_num}: sideload missing 'path'")

        if "args" in sideload and not isinstance(sideload["args"], list):
            raise ValueError(f"Invalid step {step_num}: sideload 'args' must be a list")

        if "timeout" in sideload and not isinstance(sideload["timeout"], (int, float)):
            raise ValueError(f"Invalid step {step_num}: sideload 'timeout' must be a number")

        logger.debug(f"Step {step_num} sideload validation successful")
        return True

    def _validate_tracing(self, tracing: Any, context: str) -> bool:
        """
        Validate tracing configuration.

        Args:
            tracing: Tracing configuration (bool or dict)
            context: Context for error messages (step number or 'metadata')

        Raises:
            ValueError: If tracing configuration is invalid
        """
        # Tracing can be a simple bool or a dict
        if isinstance(tracing, bool):
            return True

        if not isinstance(tracing, dict):
            raise ValueError(f"Invalid tracing in {context}: must be bool or dictionary")

        # Validate agents list if present
        if "agents" in tracing:
            agents = tracing["agents"]
            if not isinstance(agents, (list, bool)):
                raise ValueError(f"Invalid tracing.agents in {context}: must be list or bool")

            if isinstance(agents, list):
                valid_agents = ["socwatch", "ptat"]
                for agent in agents:
                    if agent not in valid_agents:
                        logger.warning(f"Unknown tracing agent '{agent}' in {context}")

        # Validate output_dir if present
        if "output_dir" in tracing and not isinstance(tracing["output_dir"], str):
            raise ValueError(f"Invalid tracing.output_dir in {context}: must be a string")

        logger.debug(f"Tracing validation successful for {context}")
        return True
    
    def get_config(self) -> Dict[str, Any]:
        """
        Get the parsed configuration.
        
        Returns:
            Configuration dictionary
        """
        return self.config
    
    def get_step(self, step_num: str) -> Optional[Dict[str, Any]]:
        """
        Get the definition for a specific step.
        
        Args:
            step_num: Step number as string
        
        Returns:
            Step definition dictionary or None if not found
        """
        steps = self.config.get("steps", {})
        return steps.get(step_num)
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get game metadata from the configuration.
        
        Returns:
            Metadata dictionary with game information
        """
        return self.config.get("metadata", {})