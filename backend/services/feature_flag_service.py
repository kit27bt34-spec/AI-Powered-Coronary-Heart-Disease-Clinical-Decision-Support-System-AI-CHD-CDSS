import logging
from typing import Dict, Any

logger = logging.getLogger("FeatureFlagService")

class FeatureFlagService:
    """Enterprise Feature Flag & Dynamic Configuration Engine."""

    _flags: Dict[str, Dict[str, Any]] = {
        "enable_catboost_v9": {"enabled": True, "description": "Use CatBoost Version 9 for inference"},
        "enable_shap_waterfall": {"enabled": True, "description": "Generate live SHAP waterfall plots"},
        "enable_pdf_reports": {"enabled": True, "description": "Enable PDF clinical report generation"},
        "enable_bed_capacity_gauge": {"enabled": True, "description": "Enable live ICU/CCU bed capacity tracking"},
        "enable_rate_limiter": {"enabled": True, "description": "Enable API rate limiting enforcement"}
    }

    @classmethod
    def is_feature_enabled(cls, flag_key: str, default: bool = False) -> bool:
        flag = cls._flags.get(flag_key)
        if flag:
            return flag.get("enabled", default)
        return default

    @classmethod
    def set_feature_flag(cls, flag_key: str, enabled: bool) -> bool:
        if flag_key not in cls._flags:
            cls._flags[flag_key] = {"enabled": enabled, "description": "Dynamic Flag"}
        else:
            cls._flags[flag_key]["enabled"] = enabled
        logger.info(f"Feature flag updated: {flag_key} -> {enabled}")
        return True

    @classmethod
    def list_feature_flags(cls) -> Dict[str, Dict[str, Any]]:
        return cls._flags

feature_flags = FeatureFlagService()
