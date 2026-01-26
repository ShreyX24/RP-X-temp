# -*- coding: utf-8 -*-
"""
Omniparser client for the backend system
"""

import os
import base64
import logging
import requests
import time
from typing import Dict, Any, Optional, List, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from ..core.timeline_manager import TimelineManager

logger = logging.getLogger(__name__)


@dataclass
class OmniparserResult:
    """Result from Omniparser processing"""
    success: bool
    elements: Optional[List[Dict[str, Any]]] = None
    annotated_image_data: Optional[bytes] = None
    response_time: Optional[float] = None
    error: Optional[str] = None


class OmniparserClient:
    """Client for communicating with Omniparser server"""

    def __init__(self, api_url: str = "http://localhost:8000", timeout: float = 60.0):
        self.api_url = api_url
        self.timeout = timeout
        self.session = requests.Session()

        # Timeline tracking for Story View (optional)
        self._timeline: Optional['TimelineManager'] = None
        self._linked_event_id: Optional[str] = None

        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Gemma-Backend-Client/2.0'
        })

        logger.debug(f"OmniparserClient initialized with URL: {api_url}")

    def set_timeline(self, timeline: 'TimelineManager', linked_event_id: str = None):
        """Set timeline for tracking service calls (for Story View)

        Args:
            timeline: TimelineManager instance for tracking
            linked_event_id: Optional event ID to link calls to (e.g., step_5)
        """
        self._timeline = timeline
        self._linked_event_id = linked_event_id

    def clear_timeline(self):
        """Clear timeline tracking"""
        self._timeline = None
        self._linked_event_id = None

    def _track_call_start(self, endpoint: str, method: str = "POST") -> Optional[str]:
        """Track service call start if timeline is set"""
        if not self._timeline:
            return None
        # Extract host from api_url for service name
        host = self.api_url.replace("http://", "").replace("https://", "").split("/")[0]
        return self._timeline.service_call_started(
            source_service="rpx_backend",
            target_service=f"omniparser_{host}",
            endpoint=endpoint,
            method=method,
            linked_event_id=self._linked_event_id,
        )

    def _track_call_end(self, event_id: Optional[str], success: bool, duration_ms: int, error: str = None, response_summary: str = None):
        """Track service call completion if timeline is set"""
        if not self._timeline or not event_id:
            return
        if success:
            self._timeline.service_call_completed(event_id, duration_ms=duration_ms, response_summary=response_summary)
        else:
            self._timeline.service_call_failed(event_id, error=error or "Unknown error", duration_ms=duration_ms)
        
    def test_connection(self) -> bool:
        """Test connection to Omniparser server"""
        try:
            response = self.session.get(
                f"{self.api_url}/probe",
                timeout=5.0
            )
            return response.status_code == 200
        except:
            return False
            
    def analyze_screenshot(
        self,
        image_path: str,
        ocr_config: Optional[Dict[str, Any]] = None
    ) -> OmniparserResult:
        """
        Analyze a screenshot with Omniparser.

        Args:
            image_path: Path to the screenshot image
            ocr_config: Optional OCR configuration dict with keys:
                - use_paddleocr: bool (True=PaddleOCR, False=EasyOCR)
                - text_threshold: float (0.0-1.0, lower = more lenient)
                - box_threshold: float (0.0-1.0, lower = detect more elements)
        """
        event_id = self._track_call_start("/parse/", "POST")
        start_time = time.time()
        try:
            if not os.path.exists(image_path):
                duration_ms = int((time.time() - start_time) * 1000)
                self._track_call_end(event_id, False, duration_ms, f"Image file not found: {image_path}")
                return OmniparserResult(
                    success=False,
                    error=f"Image file not found: {image_path}"
                )

            # Encode image to base64
            with open(image_path, "rb") as image_file:
                image_data = base64.b64encode(image_file.read()).decode('utf-8')

            # Prepare payload with OCR config
            payload = {
                "base64_image": image_data
            }

            # Add OCR config parameters if provided
            if ocr_config:
                if 'use_paddleocr' in ocr_config:
                    payload['use_paddleocr'] = ocr_config['use_paddleocr']
                if 'text_threshold' in ocr_config:
                    payload['text_threshold'] = ocr_config['text_threshold']
                if 'box_threshold' in ocr_config:
                    payload['box_threshold'] = ocr_config['box_threshold']
                if 'iou_threshold' in ocr_config:
                    payload['iou_threshold'] = ocr_config['iou_threshold']

            # Send request
            response = self.session.post(
                f"{self.api_url}/parse/",
                json=payload,
                timeout=self.timeout
            )
            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code == 200:
                response_data = response.json()

                # Extract elements
                elements = self._parse_elements(response_data)

                # Extract annotated image if available
                annotated_image_data = None
                if "som_image_base64" in response_data:
                    try:
                        annotated_image_data = base64.b64decode(response_data["som_image_base64"])
                    except Exception as e:
                        logger.warning(f"Failed to decode annotated image: {e}")

                self._track_call_end(event_id, True, duration_ms, response_summary=f"{len(elements)} elements detected")
                return OmniparserResult(
                    success=True,
                    elements=elements,
                    annotated_image_data=annotated_image_data,
                    response_time=response.elapsed.total_seconds()
                )
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                self._track_call_end(event_id, False, duration_ms, error_msg)
                return OmniparserResult(
                    success=False,
                    error=error_msg
                )

        except requests.RequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self._track_call_end(event_id, False, duration_ms, str(e))
            return OmniparserResult(
                success=False,
                error=str(e)
            )
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self._track_call_end(event_id, False, duration_ms, str(e))
            return OmniparserResult(
                success=False,
                error=f"Unexpected error: {str(e)}"
            )
            
    def _parse_elements(self, response_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse UI elements from Omniparser response"""
        elements = []
        parsed_content_list = response_data.get("parsed_content_list", [])
        
        for item in parsed_content_list:
            if 'bbox' in item:
                element = {
                    'bbox': item['bbox'],
                    'type': item.get('type', 'unknown'),
                    'content': item.get('content', ''),
                    'interactive': item.get('interactivity', False),
                    'confidence': item.get('confidence', 1.0)
                }
                elements.append(element)
                
        logger.debug(f"Parsed {len(elements)} UI elements")
        return elements
        
    def save_annotated_image(self, result: OmniparserResult, output_path: str) -> bool:
        """Save annotated image from result"""
        if not result.success or not result.annotated_image_data:
            return False
            
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(result.annotated_image_data)
            return True
        except Exception as e:
            logger.error(f"Failed to save annotated image: {e}")
            return False
            
    def get_server_status(self) -> Dict[str, Any]:
        """Get Omniparser server status"""
        try:
            response = self.session.get(
                f"{self.api_url}/probe",
                timeout=5.0
            )
            
            if response.status_code == 200:
                return {
                    "status": "online",
                    "url": self.api_url,
                    "response_time": response.elapsed.total_seconds()
                }
            else:
                return {
                    "status": "error",
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            return {
                "status": "offline",
                "error": str(e)
            }
            
    def close(self):
        """Close the session"""
        self.session.close()