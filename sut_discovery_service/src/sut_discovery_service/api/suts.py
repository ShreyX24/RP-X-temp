"""
SUT management API endpoints.
Supports SSE for real-time frontend updates.
"""

import asyncio
import json
import logging
from typing import Optional, List, Set
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..discovery import get_device_registry, get_ws_manager, SUTStatus
from ..discovery.events import event_bus, EventType, Event

logger = logging.getLogger(__name__)
router = APIRouter()

# SSE clients for real-time updates
_sse_clients: Set[asyncio.Queue] = set()


async def broadcast_sse_event(event_type: str, data: dict):
    """Broadcast event to all SSE clients"""
    event_data = json.dumps({"type": event_type, "data": data})
    dead_clients = []

    for queue in _sse_clients:
        try:
            queue.put_nowait(event_data)
        except Exception:
            dead_clients.append(queue)

    for client in dead_clients:
        _sse_clients.discard(client)


def _on_ws_connected(event: Event):
    """Handle SUT connected event"""
    asyncio.create_task(broadcast_sse_event("sut_online", event.data))


def _on_ws_disconnected(event: Event):
    """Handle SUT disconnected event"""
    asyncio.create_task(broadcast_sse_event("sut_offline", event.data))


# Subscribe to events
_sse_initialized = False


def _init_sse_handlers():
    """Initialize SSE event handlers"""
    global _sse_initialized
    if not _sse_initialized:
        event_bus.subscribe(EventType.WS_CONNECTED, _on_ws_connected)
        event_bus.subscribe(EventType.WS_DISCONNECTED, _on_ws_disconnected)
        _sse_initialized = True
        logger.info("SSE handlers initialized for SUT events")


@router.get("/suts/events")
async def sut_events_stream():
    """
    Server-Sent Events endpoint for real-time SUT updates.

    Events:
    - sut_online: When a SUT connects
    - sut_offline: When a SUT disconnects
    """
    _init_sse_handlers()

    async def event_generator():
        queue = asyncio.Queue()
        _sse_clients.add(queue)

        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'data': {'message': 'SSE connected'}})}\n\n"

            while True:
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {event_data}\n\n"
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            _sse_clients.discard(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


class PairRequest(BaseModel):
    paired_by: str = "user"


class DisplayNameRequest(BaseModel):
    display_name: str


class SUTListResponse(BaseModel):
    suts: List[dict]
    total: int
    online: int
    offline: int
    paired: int


@router.get("/suts", response_model=SUTListResponse)
async def list_suts(
    status: Optional[str] = Query(None, description="Filter by status: online, offline, paired")
):
    """
    List all discovered SUTs.

    Query params:
        status: Filter by 'online', 'offline', or 'paired'
    """
    registry = get_device_registry()
    devices = registry.get_all_devices()

    # Filter by status if specified
    if status == "online":
        devices = [d for d in devices if d.is_online]
    elif status == "offline":
        devices = [d for d in devices if not d.is_online]
    elif status == "paired":
        devices = [d for d in devices if d.is_paired]

    stats = registry.get_device_stats()

    return SUTListResponse(
        suts=[d.to_dict() for d in devices],
        total=stats["total_devices"],
        online=stats["online_devices"],
        offline=stats["offline_devices"],
        paired=stats["paired_devices"],
    )


@router.get("/suts/{unique_id}")
async def get_sut(unique_id: str):
    """Get specific SUT details."""
    registry = get_device_registry()
    device = registry.get_device_by_id(unique_id)

    if not device:
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    return device.to_dict()


@router.post("/suts/{unique_id}/pair")
async def pair_sut(unique_id: str, request: PairRequest):
    """Pair a SUT for priority scanning."""
    registry = get_device_registry()

    if not registry.pair_device(unique_id, request.paired_by):
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    device = registry.get_device_by_id(unique_id)
    return {
        "success": True,
        "message": f"SUT {unique_id} paired successfully",
        "device": device.to_dict()
    }


@router.post("/suts/{unique_id}/unpair")
async def unpair_sut(unique_id: str):
    """Unpair a SUT."""
    registry = get_device_registry()

    if not registry.unpair_device(unique_id):
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    device = registry.get_device_by_id(unique_id)
    return {
        "success": True,
        "message": f"SUT {unique_id} unpaired successfully",
        "device": device.to_dict()
    }


@router.post("/suts/{unique_id}/display-name")
async def set_display_name(unique_id: str, request: DisplayNameRequest):
    """Set display name for a SUT."""
    registry = get_device_registry()

    if not registry.set_display_name(unique_id, request.display_name):
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    device = registry.get_device_by_id(unique_id)
    return {
        "success": True,
        "display_name": request.display_name,
        "device": device.to_dict()
    }


@router.post("/discover")
async def trigger_discovery():
    """Trigger immediate discovery scan."""
    # For UDP+WebSocket discovery, SUTs register themselves
    # This endpoint is mainly for compatibility
    registry = get_device_registry()
    ws_manager = get_ws_manager()

    return {
        "message": "Discovery triggered",
        "online_suts": ws_manager.online_count,
        "total_devices": len(registry.get_all_devices()),
    }


@router.get("/discover/status")
async def discover_status():
    """Get discovery service status."""
    registry = get_device_registry()
    ws_manager = get_ws_manager()
    stats = registry.get_device_stats()

    return {
        "status": "running",
        "websocket_connections": ws_manager.online_count,
        "devices": stats,
    }


@router.get("/discovery/status")
async def discovery_status():
    """Get discovery service status (alias for /discover/status)."""
    return await discover_status()


@router.websocket("/ws/sut/{sut_id}")
async def websocket_sut_endpoint(websocket: WebSocket, sut_id: str):
    """
    WebSocket endpoint for SUT registration and communication.

    SUTs connect here to register themselves and receive commands.
    """
    await websocket.accept()

    ws_manager = get_ws_manager()
    registry = get_device_registry()

    # Get connection info from initial message
    try:
        init_data = await websocket.receive_json()
        logger.info(f"SUT {sut_id} registration data: {init_data}")

        # Register the WebSocket connection
        connection = await ws_manager.connect(sut_id, websocket, init_data)

        # Handle SSH key registration (lazy-load to avoid always loading SSH module)
        ssh_registered = False
        ssh_public_key = init_data.get("ssh_public_key")
        ssh_fingerprint = init_data.get("ssh_key_fingerprint")
        if ssh_public_key:
            try:
                from ..ssh import get_key_store
                key_store = get_key_store()
                success, msg = key_store.add_key(ssh_public_key, sut_id)
                ssh_registered = success
                if success:
                    logger.info(f"SSH key registered for {sut_id}")
                else:
                    logger.warning(f"SSH key registration failed for {sut_id}: {msg}")
            except Exception as e:
                logger.warning(f"SSH key registration skipped for {sut_id}: {e}")

        # Register/update in device registry (with SSH info)
        device = registry.register_device(
            ip=init_data.get("ip", "unknown"),
            port=init_data.get("port", 8080),
            unique_id=sut_id,
            capabilities=init_data.get("capabilities", []),
            hostname=init_data.get("hostname", ""),
            cpu_model=init_data.get("cpu_model"),
            display_name=init_data.get("display_name"),
            ssh_public_key=ssh_public_key,
            ssh_fingerprint=ssh_fingerprint,
        )

        # Get Master's public key for bidirectional SSH (lazy-load)
        master_public_key = None
        master_fingerprint = None
        re_exchange_needed = False
        try:
            from ..ssh import get_master_key_manager
            master_key_mgr = get_master_key_manager()
            master_public_key = master_key_mgr.get_public_key()
            master_fingerprint = master_key_mgr.get_fingerprint()
            # Check if re-exchange is needed (IP changed or key not installed)
            re_exchange_needed = not device.master_key_installed
        except Exception as e:
            logger.warning(f"Master key retrieval skipped: {e}")

        # Send registration acknowledgment (SUT client expects "register_ack")
        await websocket.send_json({
            "type": "register_ack",
            "message": f"SUT {sut_id} registered successfully",
            "sut_id": sut_id,
            "ssh_registered": ssh_registered,
            # Bidirectional SSH: Send Master's key for SUT to install
            "master_public_key": master_public_key,
            "master_fingerprint": master_fingerprint,
            "re_exchange": re_exchange_needed,
            "session_id": device.session_id,
        })

        # Keep connection alive and handle messages
        while True:
            try:
                message = await websocket.receive_json()
                logger.debug(f"Message from SUT {sut_id}: {message}")

                # Handle different message types
                msg_type = message.get("type")

                if msg_type == "heartbeat":
                    registry.register_device(
                        ip=init_data.get("ip", "unknown"),
                        port=init_data.get("port", 8080),
                        unique_id=sut_id,
                        capabilities=init_data.get("capabilities", []),
                        hostname=init_data.get("hostname", ""),
                    )
                    await websocket.send_json({"type": "heartbeat_ack"})

                elif msg_type == "status_update":
                    # Update device status in registry
                    pass

                elif msg_type == "master_key_installed":
                    # SUT confirms it has installed Master's public key
                    success = message.get("success", False)
                    if success:
                        registry.update_master_key_status(sut_id, installed=True)
                        logger.info(f"Master key installed on {sut_id}")
                        await websocket.send_json({
                            "type": "master_key_installed_ack",
                            "success": True,
                        })
                    else:
                        error = message.get("error", "Unknown error")
                        logger.warning(f"Master key installation failed on {sut_id}: {error}")
                        await websocket.send_json({
                            "type": "master_key_installed_ack",
                            "success": False,
                            "error": error,
                        })

            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        logger.info(f"SUT {sut_id} disconnected during registration")
    except Exception as e:
        logger.error(f"Error in SUT {sut_id} WebSocket: {e}")
    finally:
        await ws_manager.disconnect(sut_id)
        registry.mark_device_offline(sut_id)


# ==================== STALE DEVICE CLEANUP ENDPOINTS ====================

class StaleSettingsRequest(BaseModel):
    """Request to update stale device timeout"""
    timeout_seconds: int


class CleanupRequest(BaseModel):
    """Request to cleanup stale devices with optional timeout override"""
    timeout_seconds: Optional[int] = None


@router.get("/suts/settings/stale-timeout")
async def get_stale_timeout():
    """Get the current stale device timeout setting."""
    registry = get_device_registry()
    return {
        "stale_timeout_seconds": registry.get_stale_timeout(),
        "stale_timeout_minutes": registry.get_stale_timeout() / 60
    }


@router.put("/suts/settings/stale-timeout")
async def set_stale_timeout(request: StaleSettingsRequest):
    """
    Set the stale device timeout.

    Unpaired offline devices will be removed after this timeout.
    Set to 0 to disable automatic cleanup.
    """
    if request.timeout_seconds < 0:
        raise HTTPException(status_code=400, detail="Timeout must be >= 0")

    registry = get_device_registry()
    old_timeout = registry.get_stale_timeout()
    registry.set_stale_timeout(request.timeout_seconds)

    return {
        "success": True,
        "old_timeout_seconds": old_timeout,
        "new_timeout_seconds": request.timeout_seconds,
        "message": f"Stale timeout updated from {old_timeout}s to {request.timeout_seconds}s"
    }


@router.post("/suts/cleanup")
async def cleanup_stale_devices(request: Optional[CleanupRequest] = None):
    """
    Remove stale (unpaired + offline) devices.

    Optionally provide a timeout_seconds to override the current setting.
    Only removes unpaired devices that have been offline longer than the timeout.
    """
    registry = get_device_registry()
    timeout = request.timeout_seconds if request and request.timeout_seconds else None

    result = registry.remove_stale_devices(timeout)

    return {
        "success": True,
        "removed_count": result["removed_count"],
        "removed_devices": result["removed_devices"],
        "timeout_used_seconds": result["timeout_used"]
    }


class BroadcastUpdateRequest(BaseModel):
    """Request to broadcast update availability to SUTs"""
    master_ip: str
    version: Optional[str] = None
    updated_at: Optional[str] = None
    components: Optional[dict] = None


@router.post("/suts/broadcast-update")
async def broadcast_update(request: BroadcastUpdateRequest):
    """
    Broadcast update availability to all connected SUTs.

    SUTs will receive a WebSocket message with type "update_available"
    and can then pull updates from the master via SSH.
    """
    ws_manager = get_ws_manager()

    message = {
        "type": "update_available",
        "master_ip": request.master_ip,
        "version": request.version,
        "updated_at": request.updated_at,
        "components": request.components or {},
    }

    results = await ws_manager.broadcast(message)
    notified = sum(1 for v in results.values() if v)

    logger.info(f"Broadcast update notification to {notified}/{len(results)} SUTs")

    return {
        "status": "ok",
        "notified": notified,
        "total_connected": len(results),
        "results": results,
    }


@router.delete("/suts/{unique_id}")
async def delete_sut(unique_id: str, force: bool = Query(False, description="Force delete even if paired")):
    """
    Delete a specific SUT from the registry.

    By default, paired devices cannot be deleted. Use force=true to override.
    """
    registry = get_device_registry()
    device = registry.get_device_by_id(unique_id)

    if not device:
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    if device.is_paired and not force:
        raise HTTPException(
            status_code=400,
            detail=f"SUT {unique_id} is paired. Use force=true to delete paired devices."
        )

    # Remove from registry
    if device.ip in registry.ip_to_id_mapping:
        del registry.ip_to_id_mapping[device.ip]
    del registry.devices[unique_id]

    # If it was paired, save the updated list
    if device.is_paired:
        registry.save_paired_devices()

    logger.info(f"Deleted SUT {unique_id} (force={force})")

    return {
        "success": True,
        "message": f"SUT {unique_id} deleted successfully",
        "was_paired": device.is_paired
    }


# ==================== SSH MANAGEMENT ENDPOINTS ====================

class SSHExchangeRequest(BaseModel):
    """Request to trigger SSH key exchange"""
    force: bool = False


@router.post("/suts/{unique_id}/ssh/exchange")
async def trigger_ssh_exchange(unique_id: str, request: Optional[SSHExchangeRequest] = None):
    """
    Trigger SSH key exchange with a specific SUT.

    This sends the Master's public key to the SUT via WebSocket,
    prompting it to add the key to authorized_keys.

    Args:
        unique_id: SUT unique identifier
        force: Force re-exchange even if key is already installed
    """
    force = request.force if request else False
    registry = get_device_registry()
    ws_manager = get_ws_manager()

    device = registry.get_device_by_id(unique_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    if not device.is_online:
        raise HTTPException(status_code=400, detail=f"SUT {unique_id} is offline")

    if device.master_key_installed and not force:
        return {
            "success": True,
            "message": "Master key already installed",
            "master_key_installed": True,
            "installed_at": device.master_key_installed_at.isoformat() if device.master_key_installed_at else None,
        }

    # Get Master's public key
    try:
        from ..ssh import get_master_key_manager
        master_key_mgr = get_master_key_manager()
        master_public_key = master_key_mgr.get_public_key()
        master_fingerprint = master_key_mgr.get_fingerprint()

        if not master_public_key:
            raise HTTPException(status_code=500, detail="Master SSH key not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Master key: {e}")

    # Send key exchange request via WebSocket
    message = {
        "type": "install_master_key",
        "master_public_key": master_public_key,
        "master_fingerprint": master_fingerprint,
        "force": force,
    }

    success = await ws_manager.send_to_device(unique_id, message)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send key exchange request")

    return {
        "success": True,
        "message": "Key exchange request sent",
        "master_fingerprint": master_fingerprint,
        "force": force,
    }


@router.get("/suts/{unique_id}/ssh/status")
async def get_ssh_status(unique_id: str):
    """
    Get SSH status for a specific SUT.

    Returns information about bidirectional SSH setup:
    - SUT's SSH key registration status on Master
    - Master's key installation status on SUT
    - Session binding information
    - IP change history
    """
    registry = get_device_registry()
    device = registry.get_device_by_id(unique_id)

    if not device:
        raise HTTPException(status_code=404, detail=f"SUT {unique_id} not found")

    # Get Master key info
    master_key_info = {}
    try:
        from ..ssh import get_master_key_manager
        master_key_mgr = get_master_key_manager()
        master_key_info = {
            "fingerprint": master_key_mgr.get_fingerprint(),
            "available": master_key_mgr.get_public_key() is not None,
        }
    except Exception as e:
        master_key_info = {"error": str(e)}

    # Get SUT key registration status on Master
    sut_key_registered = False
    try:
        from ..ssh import get_key_store
        key_store = get_key_store()
        if device.ssh_fingerprint:
            sut_key_registered = key_store.is_key_registered(device.ssh_fingerprint)
    except Exception:
        pass

    return {
        "unique_id": unique_id,
        "ip": device.ip,
        "hostname": device.hostname,
        "is_online": device.is_online,
        # SUT -> Master SSH (SUT's key on Master)
        "sut_to_master": {
            "ssh_fingerprint": device.ssh_fingerprint,
            "registered_on_master": sut_key_registered,
        },
        # Master -> SUT SSH (Master's key on SUT)
        "master_to_sut": {
            "master_key_installed": device.master_key_installed,
            "installed_at": device.master_key_installed_at.isoformat() if device.master_key_installed_at else None,
        },
        "master_key_info": master_key_info,
        # Binding information
        "binding": {
            "session_id": device.session_id,
            "last_ip_change": device.last_ip_change.isoformat() if device.last_ip_change else None,
            "ip_change_count": len(device.binding_history),
            "binding_history": device.binding_history[-5:],  # Last 5 changes
        },
    }


@router.get("/suts/ssh/diagnose/{ip}")
async def diagnose_ssh_connectivity(ip: str):
    """
    Diagnose SSH connectivity to a SUT by IP address.

    Attempts to connect to the SUT via SSH using Master's key
    and returns diagnostic information.
    """
    # Try to find device in registry
    registry = get_device_registry()
    device = registry.get_device_by_ip(ip)

    device_info = None
    if device:
        device_info = {
            "unique_id": device.unique_id,
            "hostname": device.hostname,
            "is_online": device.is_online,
            "master_key_installed": device.master_key_installed,
        }

    # Test SSH connection
    ssh_result = {"tested": False}
    try:
        from ..ssh import get_master_key_manager
        master_key_mgr = get_master_key_manager()

        # Ensure Master key exists
        key_exists, key_msg = master_key_mgr.ensure_key_exists()
        if not key_exists:
            ssh_result = {
                "tested": False,
                "error": f"Master key not available: {key_msg}",
            }
        else:
            # Test connection
            success, msg = master_key_mgr.test_connection(ip, timeout=10)
            ssh_result = {
                "tested": True,
                "connected": success,
                "message": msg,
                "master_fingerprint": master_key_mgr.get_fingerprint(),
            }
    except Exception as e:
        ssh_result = {
            "tested": False,
            "error": str(e),
        }

    return {
        "ip": ip,
        "device_found": device is not None,
        "device_info": device_info,
        "ssh": ssh_result,
    }


@router.get("/ssh/master-key")
async def get_master_key_info():
    """
    Get information about the Master's SSH key.

    Used for diagnostics and displaying Master's fingerprint.
    """
    try:
        from ..ssh import get_master_key_manager
        master_key_mgr = get_master_key_manager()

        return {
            "exists": master_key_mgr.key_path.exists(),
            "fingerprint": master_key_mgr.get_fingerprint(),
            "public_key_path": str(master_key_mgr.public_key_path),
            "private_key_path": str(master_key_mgr.key_path),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
