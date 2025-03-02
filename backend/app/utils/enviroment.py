import os
import logging
from typing import Any, Optional, TypeVar, cast

T = TypeVar('T')

def get_env_or_default(key: str, default: T, required: bool = False) -> T:
    """
    Get an environment variable with a default value.
    
    Args:
        key: The environment variable name
        default: The default value to return if not found
        required: If True, log a warning when using the default value
        
    Returns:
        The environment variable value or the default
    """
    value = os.getenv(key)
    
    if value is None:
        if required:
            logging.warning(f"Required environment variable {key} not set, using default: {default}")
        return default
    
    # Try to convert to the same type as the default
    try:
        if isinstance(default, bool):
            return cast(T, value.lower() in ('true', 'yes', '1', 'y'))
        elif isinstance(default, int):
            return cast(T, int(value))
        elif isinstance(default, float):
            return cast(T, float(value))
        else:
            return cast(T, value)
    except (ValueError, TypeError):
        logging.warning(f"Could not convert environment variable {key}={value} to type {type(default).__name__}, using default")
        return default