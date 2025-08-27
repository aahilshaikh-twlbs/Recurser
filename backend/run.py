#!/usr/bin/env python3
"""
Circuit Validator Backend Runner
"""

import uvicorn
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
