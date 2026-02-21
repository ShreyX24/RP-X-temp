"""
System utilities for SUT Client
Provides PC rename, process management, and other system-level operations

Merged with KATANA RPX v0.2 process management functions
"""

import os
import platform
import subprocess
import re
import logging
import ctypes
import ctypes.wintypes
from typing import Dict, Any, Optional

import psutil

logger = logging.getLogger(__name__)


# =============================================================================
# Process Detection (from KATANA RPX v0.2)
# =============================================================================

def find_process_by_name(process_name: str, exact_only: bool = True) -> Optional[psutil.Process]:
    """
    Find a running process by its name.

    Args:
        process_name: Name of process to find (e.g., "RDR2.exe")
        exact_only: If True (default), only exact matches are returned.
                    If False, substring matches are also allowed.

    Returns:
        psutil.Process or None
    """
    try:
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                proc_name = proc.info['name']
                proc_exe = os.path.basename(proc.info['exe']) if proc.info['exe'] else None

                if exact_only:
                    # EXACT match only (case-insensitive)
                    if (proc_name and proc_name.lower() == process_name.lower()) or \
                       (proc_exe and proc_exe.lower() == process_name.lower()):
                        logger.info(f"[EXACT] Found process: {proc_name} (PID: {proc.info['pid']})")
                        return psutil.Process(proc.info['pid'])
                else:
                    # Partial/substring match
                    if (proc_name and process_name.lower() in proc_name.lower()) or \
                       (proc_exe and process_name.lower() in proc_exe.lower()):
                        logger.info(f"[PARTIAL] Found process: {proc_name} (PID: {proc.info['pid']})")
                        return psutil.Process(proc.info['pid'])

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

    except Exception as e:
        logger.error(f"Error searching for process {process_name}: {str(e)}")
    return None


def check_process(process_name: str) -> Dict[str, Any]:
    """
    Check if a process is running by name.

    Args:
        process_name: Process name to check

    Returns:
        dict with running status, pid, and name
    """
    logger.debug(f"[Process] Checking if '{process_name}' is running")
    proc = find_process_by_name(process_name)

    if proc:
        logger.debug(f"[Process] '{process_name}' is running: PID={proc.pid}, name={proc.name()}")
        return {
            "status": "success",
            "running": True,
            "pid": proc.pid,
            "name": proc.name()
        }
    else:
        logger.debug(f"[Process] '{process_name}' is not running")
        return {
            "status": "success",
            "running": False
        }


def terminate_process_by_name(process_name: str) -> bool:
    """
    Terminate a process by its name using psutil.

    Args:
        process_name: Name of process to terminate

    Returns:
        True if any process was terminated
    """
    try:
        processes_terminated = []
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                if (proc.info['name'] and process_name.lower() in proc.info['name'].lower()) or \
                   (proc.info['exe'] and process_name.lower() in os.path.basename(proc.info['exe']).lower()):

                    process = psutil.Process(proc.info['pid'])
                    logger.info(f"Terminating process: {proc.info['name']} (PID: {proc.info['pid']})")

                    process.terminate()
                    try:
                        process.wait(timeout=5)
                        processes_terminated.append(proc.info['name'])
                    except psutil.TimeoutExpired:
                        logger.warning(f"Force killing process: {proc.info['name']}")
                        process.kill()
                        processes_terminated.append(proc.info['name'])

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        if processes_terminated:
            logger.info(f"Successfully terminated processes: {processes_terminated}")
            return True
        else:
            logger.info(f"No processes found with name: {process_name}")
            return False

    except Exception as e:
        logger.error(f"Error terminating process {process_name}: {str(e)}")
        return False


# =============================================================================
# Admin Privileges Check
# =============================================================================

def is_admin() -> bool:
    """Check if running with administrator privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False


# =============================================================================
# Session Detection (Interactive Desktop)
# =============================================================================

def get_interactive_session_id() -> int:
    """
    Get the Windows session ID attached to the physical console (keyboard/monitor).

    Uses WTSGetActiveConsoleSessionId to find the session that owns the
    physical display. This is the session where GUI tools like PTAT need to run.

    Returns:
        Session ID (typically 1+) or -1 on failure
    """
    try:
        session_id = ctypes.windll.kernel32.WTSGetActiveConsoleSessionId()
        if session_id == 0xFFFFFFFF:
            logger.warning("[Session] No active console session found")
            return -1
        return session_id
    except Exception as e:
        logger.error(f"[Session] Failed to get interactive session ID: {e}")
        return -1


def get_process_session_id(pid: int) -> int:
    """
    Get the Windows session ID that a process belongs to.

    Args:
        pid: Process ID to query

    Returns:
        Session ID or -1 on failure
    """
    try:
        session_id = ctypes.wintypes.DWORD()
        result = ctypes.windll.kernel32.ProcessIdToSessionId(
            ctypes.wintypes.DWORD(pid),
            ctypes.byref(session_id)
        )
        if result:
            return session_id.value
        else:
            logger.warning(f"[Session] ProcessIdToSessionId failed for PID {pid}")
            return -1
    except Exception as e:
        logger.error(f"[Session] Failed to get session ID for PID {pid}: {e}")
        return -1


def get_interactive_username() -> Optional[str]:
    """
    Get the username of the user logged into the interactive desktop session.

    Uses WTS API to query the username associated with the console session.
    This is critical for resolving paths like %USERPROFILE% when the SUT client
    runs as a different user (e.g., Administrator via SSH) than the interactive
    user (e.g., Local_Admin on the physical desktop).

    Returns:
        Username string (e.g., "Local_Admin") or None on failure
    """
    try:
        session_id = get_interactive_session_id()
        if session_id < 0:
            return None

        # WTS constants
        WTSUserName = 5

        # WTSQuerySessionInformation
        wtsapi32 = ctypes.windll.wtsapi32
        WTS_CURRENT_SERVER_HANDLE = 0

        buffer = ctypes.c_wchar_p()
        bytes_returned = ctypes.wintypes.DWORD()

        result = wtsapi32.WTSQuerySessionInformationW(
            WTS_CURRENT_SERVER_HANDLE,
            session_id,
            WTSUserName,
            ctypes.byref(buffer),
            ctypes.byref(bytes_returned)
        )

        if result and buffer.value:
            username = buffer.value
            wtsapi32.WTSFreeMemory(buffer)
            logger.info(f"[Session] Interactive user: {username} (session {session_id})")
            return username
        else:
            logger.warning(f"[Session] WTSQuerySessionInformation failed for session {session_id}")
            return None

    except Exception as e:
        logger.error(f"[Session] Failed to get interactive username: {e}")
        return None


def is_in_interactive_session() -> bool:
    """
    Check if the current process is running in the interactive desktop session.

    Compares the current process's session ID to the console session ID.
    If they differ, processes launched by us won't have desktop access (e.g.,
    PTAT can't capture GPU/thermal data without the interactive session).

    Returns:
        True if current process is in the interactive session, False otherwise
    """
    interactive_sid = get_interactive_session_id()
    if interactive_sid < 0:
        return False
    current_sid = get_process_session_id(os.getpid())
    is_interactive = current_sid == interactive_sid
    logger.debug(f"[Session] Current session={current_sid}, interactive session={interactive_sid}, match={is_interactive}")
    return is_interactive


def check_process_health(process_name: str) -> Dict[str, Any]:
    """
    Extended health check for a running process. Returns detailed metrics
    including CPU time, memory, session ID, and status — useful for detecting
    zombie/stuck processes that are alive but doing nothing.

    Args:
        process_name: Process name to check (e.g., "PTAT.exe")

    Returns:
        Dict with running status plus health metrics (cpu_time, memory_mb,
        session_id, create_time, proc_status)
    """
    logger.debug(f"[Health] Checking health of '{process_name}'")
    proc = find_process_by_name(process_name)

    if not proc:
        logger.debug(f"[Health] '{process_name}' is not running")
        return {
            "status": "success",
            "running": False
        }

    try:
        cpu_times = proc.cpu_times()
        cpu_time = cpu_times.user + cpu_times.system
        memory_mb = proc.memory_info().rss / (1024 * 1024)
        create_time = proc.create_time()
        proc_status = proc.status()
        session_id = get_process_session_id(proc.pid)

        health = {
            "status": "success",
            "running": True,
            "pid": proc.pid,
            "name": proc.name(),
            "cpu_time": round(cpu_time, 2),
            "memory_mb": round(memory_mb, 1),
            "session_id": session_id,
            "create_time": create_time,
            "proc_status": proc_status
        }
        logger.debug(f"[Health] {process_name}: cpu_time={cpu_time:.2f}s, mem={memory_mb:.1f}MB, session={session_id}, status={proc_status}")
        return health

    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess) as e:
        logger.warning(f"[Health] Error reading process metrics for {process_name}: {e}")
        return {
            "status": "success",
            "running": True,
            "pid": proc.pid,
            "name": process_name,
            "cpu_time": 0,
            "memory_mb": 0,
            "session_id": -1,
            "create_time": 0,
            "proc_status": "unknown"
        }


# =============================================================================
# PC Rename Functions (Original PM)
# =============================================================================


def rename_computer(new_name: str) -> Dict[str, Any]:
    """
    Rename the Windows computer hostname.

    Uses PowerShell Rename-Computer command. Requires admin privileges.
    The change takes effect after a system restart.

    Args:
        new_name: New computer name (hostname)

    Returns:
        Dict with:
            - success: bool - Whether rename command succeeded
            - requires_reboot: bool - Always True for Windows hostname changes
            - message: str - Status message
            - error: str - Error message if failed
    """
    result = {
        "success": False,
        "requires_reboot": True,
        "message": "",
        "error": None
    }

    # Validate platform
    if platform.system() != "Windows":
        result["error"] = "PC rename is only supported on Windows"
        result["message"] = "Rename failed: Not a Windows system"
        return result

    # Validate new name
    if not new_name:
        result["error"] = "New name cannot be empty"
        result["message"] = "Rename failed: Empty name provided"
        return result

    # Validate hostname format (Windows NetBIOS name rules)
    # - Max 15 characters
    # - No special characters except hyphen
    # - Cannot start or end with hyphen
    if not is_valid_hostname(new_name):
        result["error"] = f"Invalid hostname: '{new_name}'. Must be 1-15 chars, alphanumeric and hyphens only, cannot start/end with hyphen."
        result["message"] = "Rename failed: Invalid hostname format"
        return result

    try:
        # Use PowerShell to rename the computer
        # -Force bypasses confirmation prompts
        # Note: Requires elevated privileges (run as Administrator)
        cmd = [
            "powershell",
            "-Command",
            f'Rename-Computer -NewName "{new_name}" -Force'
        ]

        logger.info(f"Executing PC rename: {new_name}")

        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if process.returncode == 0:
            result["success"] = True
            result["message"] = f"Computer renamed to '{new_name}'. Restart required for changes to take effect."
            logger.info(f"PC rename successful: {new_name}")
        else:
            error_msg = process.stderr.strip() if process.stderr else "Unknown error"

            # Check for common errors
            if "Access is denied" in error_msg or "PermissionDenied" in error_msg:
                result["error"] = "Access denied. SUT Client must run as Administrator."
                result["message"] = "Rename failed: Administrator privileges required"
            elif "already in use" in error_msg.lower():
                result["error"] = f"The name '{new_name}' is already in use on the network."
                result["message"] = "Rename failed: Name already in use"
            else:
                result["error"] = error_msg
                result["message"] = f"Rename failed: {error_msg}"

            logger.error(f"PC rename failed: {error_msg}")

    except subprocess.TimeoutExpired:
        result["error"] = "Command timed out"
        result["message"] = "Rename failed: Command timed out"
        logger.error("PC rename command timed out")

    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Rename failed: {str(e)}"
        logger.error(f"PC rename exception: {e}")

    return result


def is_valid_hostname(name: str) -> bool:
    """
    Validate Windows hostname (NetBIOS name).

    Rules:
    - 1-15 characters
    - Alphanumeric and hyphens only
    - Cannot start or end with hyphen
    - Cannot be all digits

    Args:
        name: Proposed hostname

    Returns:
        True if valid, False otherwise
    """
    if not name:
        return False

    if len(name) > 15:
        return False

    # Check allowed characters (alphanumeric and hyphen)
    if not re.match(r'^[a-zA-Z0-9-]+$', name):
        return False

    # Cannot start or end with hyphen
    if name.startswith('-') or name.endswith('-'):
        return False

    # Cannot be all digits
    if name.isdigit():
        return False

    return True


def get_current_hostname() -> str:
    """
    Get current computer hostname.

    Returns:
        Current hostname
    """
    import socket
    return socket.gethostname()


def reboot_computer(delay_seconds: int = 0) -> Dict[str, Any]:
    """
    Reboot the computer.

    Args:
        delay_seconds: Delay before reboot (0 = immediate)

    Returns:
        Dict with success status and message
    """
    result = {
        "success": False,
        "message": "",
        "error": None
    }

    if platform.system() != "Windows":
        result["error"] = "Reboot command is only supported on Windows"
        return result

    try:
        cmd = ["shutdown", "/r", "/t", str(delay_seconds)]

        if delay_seconds > 0:
            cmd.extend(["/c", f"System will restart in {delay_seconds} seconds"])

        process = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

        if process.returncode == 0:
            result["success"] = True
            result["message"] = f"Reboot initiated (delay: {delay_seconds}s)"
        else:
            result["error"] = process.stderr.strip() if process.stderr else "Unknown error"
            result["message"] = f"Reboot failed: {result['error']}"

    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Reboot failed: {str(e)}"

    return result


def kill_process(process_name: str) -> Dict[str, Any]:
    """
    Kill a process by name.

    Args:
        process_name: Process name (e.g., "game.exe")

    Returns:
        Dict with success status and message
    """
    result = {
        "success": False,
        "message": "",
        "error": None,
        "killed": False
    }

    if platform.system() != "Windows":
        result["error"] = "Kill process is only supported on Windows"
        return result

    # Ensure .exe extension
    if not process_name.lower().endswith('.exe'):
        process_name = f"{process_name}.exe"

    try:
        # Use taskkill to forcefully terminate the process
        cmd = ["taskkill", "/F", "/IM", process_name]

        logger.info(f"Killing process: {process_name}")
        logger.debug(f"[Process] Executing: {' '.join(cmd)}")

        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10
        )

        if process.returncode == 0:
            result["success"] = True
            result["killed"] = True
            result["message"] = f"Process '{process_name}' terminated"
            logger.info(f"Process killed: {process_name}")
        elif "not found" in process.stderr.lower() or process.returncode == 128:
            # Process wasn't running - that's okay
            result["success"] = True
            result["killed"] = False
            result["message"] = f"Process '{process_name}' was not running"
            logger.debug(f"Process not running: {process_name}")
        else:
            result["error"] = process.stderr.strip() if process.stderr else "Unknown error"
            result["message"] = f"Failed to kill process: {result['error']}"
            logger.error(f"Failed to kill {process_name}: {result['error']}")

    except subprocess.TimeoutExpired:
        result["error"] = "Command timed out"
        result["message"] = "Kill process timed out"
        logger.error(f"Kill process timed out: {process_name}")

    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Kill process failed: {str(e)}"
        logger.error(f"Kill process exception: {e}")

    return result
