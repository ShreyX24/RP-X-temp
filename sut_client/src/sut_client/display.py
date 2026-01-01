"""
Display Resolution Management for Windows

Provides functionality to enumerate and change Windows display resolutions.
Uses the Windows User32 API via ctypes.
"""

import ctypes
from ctypes import wintypes
from dataclasses import dataclass
from typing import List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Windows constants
DM_PELSWIDTH = 0x00080000
DM_PELSHEIGHT = 0x00100000
DM_DISPLAYFREQUENCY = 0x00400000
DISP_CHANGE_SUCCESSFUL = 0
DISP_CHANGE_RESTART = 1
DISP_CHANGE_FAILED = -1
DISP_CHANGE_BADMODE = -2
DISP_CHANGE_NOTUPDATED = -3
DISP_CHANGE_BADFLAGS = -4
DISP_CHANGE_BADPARAM = -5
CDS_TEST = 0x00000002
CDS_UPDATEREGISTRY = 0x00000001
ENUM_CURRENT_SETTINGS = -1


class DEVMODEW(ctypes.Structure):
    """Windows DEVMODEW structure for display settings"""
    _fields_ = [
        ("dmDeviceName", wintypes.WCHAR * 32),
        ("dmSpecVersion", wintypes.WORD),
        ("dmDriverVersion", wintypes.WORD),
        ("dmSize", wintypes.WORD),
        ("dmDriverExtra", wintypes.WORD),
        ("dmFields", wintypes.DWORD),
        ("dmPositionX", wintypes.LONG),
        ("dmPositionY", wintypes.LONG),
        ("dmDisplayOrientation", wintypes.DWORD),
        ("dmDisplayFixedOutput", wintypes.DWORD),
        ("dmColor", wintypes.SHORT),
        ("dmDuplex", wintypes.SHORT),
        ("dmYResolution", wintypes.SHORT),
        ("dmTTOption", wintypes.SHORT),
        ("dmCollate", wintypes.SHORT),
        ("dmFormName", wintypes.WCHAR * 32),
        ("dmLogPixels", wintypes.WORD),
        ("dmBitsPerPel", wintypes.DWORD),
        ("dmPelsWidth", wintypes.DWORD),
        ("dmPelsHeight", wintypes.DWORD),
        ("dmDisplayFlags", wintypes.DWORD),
        ("dmDisplayFrequency", wintypes.DWORD),
        ("dmICMMethod", wintypes.DWORD),
        ("dmICMIntent", wintypes.DWORD),
        ("dmMediaType", wintypes.DWORD),
        ("dmDitherType", wintypes.DWORD),
        ("dmReserved1", wintypes.DWORD),
        ("dmReserved2", wintypes.DWORD),
        ("dmPanningWidth", wintypes.DWORD),
        ("dmPanningHeight", wintypes.DWORD),
    ]


@dataclass
class Resolution:
    """Represents a display resolution"""
    width: int
    height: int
    refresh_rate: int = 60

    def __hash__(self):
        return hash((self.width, self.height, self.refresh_rate))

    def __eq__(self, other):
        if not isinstance(other, Resolution):
            return False
        return (self.width, self.height, self.refresh_rate) == (other.width, other.height, other.refresh_rate)

    def to_dict(self) -> dict:
        return {
            "width": self.width,
            "height": self.height,
            "refresh_rate": self.refresh_rate
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Resolution":
        return cls(
            width=data.get("width", 1920),
            height=data.get("height", 1080),
            refresh_rate=data.get("refresh_rate", 60)
        )


class DisplayManager:
    """Manages Windows display resolution changes"""

    def __init__(self):
        self.user32 = ctypes.windll.user32
        self._original_resolution: Optional[Resolution] = None

    def get_current_resolution(self) -> Resolution:
        """Get the current display resolution"""
        dm = DEVMODEW()
        dm.dmSize = ctypes.sizeof(DEVMODEW)

        if self.user32.EnumDisplaySettingsW(None, ENUM_CURRENT_SETTINGS, ctypes.byref(dm)):
            return Resolution(
                width=dm.dmPelsWidth,
                height=dm.dmPelsHeight,
                refresh_rate=dm.dmDisplayFrequency
            )
        else:
            logger.error("Failed to get current display settings")
            return Resolution(1920, 1080, 60)

    def get_supported_resolutions(self) -> List[Resolution]:
        """
        Enumerate all supported display resolutions.

        Returns a list of unique resolutions sorted by width (descending),
        then height (descending), then refresh rate (descending).
        """
        resolutions = set()
        dm = DEVMODEW()
        dm.dmSize = ctypes.sizeof(DEVMODEW)

        i = 0
        while self.user32.EnumDisplaySettingsW(None, i, ctypes.byref(dm)):
            # Only include reasonable resolutions (at least 720p)
            if dm.dmPelsWidth >= 1280 and dm.dmPelsHeight >= 720:
                res = Resolution(
                    width=dm.dmPelsWidth,
                    height=dm.dmPelsHeight,
                    refresh_rate=dm.dmDisplayFrequency
                )
                resolutions.add(res)
            i += 1

        # Sort by width desc, height desc, refresh desc
        sorted_res = sorted(
            resolutions,
            key=lambda r: (r.width, r.height, r.refresh_rate),
            reverse=True
        )

        return sorted_res

    def get_common_resolutions(self) -> List[Resolution]:
        """
        Get list of common gaming resolutions that are supported.

        Filters supported resolutions to only include common ones:
        - 3840x2160 (4K)
        - 2560x1440 (1440p)
        - 1920x1080 (1080p)
        - 1280x720 (720p)
        """
        common = [
            (3840, 2160),
            (2560, 1440),
            (1920, 1080),
            (1280, 720),
        ]

        supported = self.get_supported_resolutions()
        result = []

        for width, height in common:
            # Find best refresh rate for this resolution
            matching = [r for r in supported if r.width == width and r.height == height]
            if matching:
                # Get highest refresh rate
                best = max(matching, key=lambda r: r.refresh_rate)
                result.append(best)

        return result

    def is_resolution_supported(self, width: int, height: int) -> bool:
        """Check if a specific resolution is supported"""
        supported = self.get_supported_resolutions()
        return any(r.width == width and r.height == height for r in supported)

    def set_resolution(self, width: int, height: int, refresh_rate: int = None) -> Tuple[bool, str]:
        """
        Change the Windows display resolution.

        Args:
            width: Target width in pixels
            height: Target height in pixels
            refresh_rate: Optional refresh rate (uses highest available if not specified)

        Returns:
            Tuple of (success: bool, message: str)
        """
        # Store original resolution for potential restore
        if self._original_resolution is None:
            self._original_resolution = self.get_current_resolution()
            logger.info(f"Stored original resolution: {self._original_resolution.width}x{self._original_resolution.height}")

        # Find a supported mode with the requested resolution
        supported = self.get_supported_resolutions()
        matching = [r for r in supported if r.width == width and r.height == height]

        if not matching:
            return False, f"Resolution {width}x{height} is not supported by this display"

        # Select refresh rate
        if refresh_rate:
            target = next((r for r in matching if r.refresh_rate == refresh_rate), None)
            if not target:
                # Use closest refresh rate
                target = min(matching, key=lambda r: abs(r.refresh_rate - refresh_rate))
                logger.warning(f"Requested refresh rate {refresh_rate}Hz not available, using {target.refresh_rate}Hz")
        else:
            # Use highest available refresh rate
            target = max(matching, key=lambda r: r.refresh_rate)

        # Configure DEVMODE structure
        dm = DEVMODEW()
        dm.dmSize = ctypes.sizeof(DEVMODEW)
        dm.dmPelsWidth = target.width
        dm.dmPelsHeight = target.height
        dm.dmDisplayFrequency = target.refresh_rate
        dm.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT | DM_DISPLAYFREQUENCY

        # Test the change first
        result = self.user32.ChangeDisplaySettingsW(ctypes.byref(dm), CDS_TEST)
        if result != DISP_CHANGE_SUCCESSFUL:
            error_msg = self._get_error_message(result)
            return False, f"Resolution change test failed: {error_msg}"

        # Apply the change
        result = self.user32.ChangeDisplaySettingsW(ctypes.byref(dm), CDS_UPDATEREGISTRY)

        if result == DISP_CHANGE_SUCCESSFUL:
            logger.info(f"Resolution changed to {target.width}x{target.height}@{target.refresh_rate}Hz")
            return True, f"Resolution changed to {target.width}x{target.height}@{target.refresh_rate}Hz"
        elif result == DISP_CHANGE_RESTART:
            logger.warning("Resolution change requires restart")
            return True, "Resolution changed but requires system restart to take full effect"
        else:
            error_msg = self._get_error_message(result)
            return False, f"Resolution change failed: {error_msg}"

    def restore_original_resolution(self) -> Tuple[bool, str]:
        """Restore the original resolution that was saved before changes"""
        if self._original_resolution is None:
            return True, "No original resolution to restore"

        success, msg = self.set_resolution(
            self._original_resolution.width,
            self._original_resolution.height,
            self._original_resolution.refresh_rate
        )

        if success:
            self._original_resolution = None
            logger.info("Original resolution restored")

        return success, msg

    def _get_error_message(self, result: int) -> str:
        """Convert ChangeDisplaySettings result code to message"""
        messages = {
            DISP_CHANGE_SUCCESSFUL: "Success",
            DISP_CHANGE_RESTART: "Restart required",
            DISP_CHANGE_FAILED: "The display driver failed the specified graphics mode",
            DISP_CHANGE_BADMODE: "The graphics mode is not supported",
            DISP_CHANGE_NOTUPDATED: "Unable to write settings to the registry",
            DISP_CHANGE_BADFLAGS: "Invalid flags",
            DISP_CHANGE_BADPARAM: "Invalid parameter",
        }
        return messages.get(result, f"Unknown error ({result})")


# Global instance for convenience
_display_manager: Optional[DisplayManager] = None


def get_display_manager() -> DisplayManager:
    """Get the global DisplayManager instance"""
    global _display_manager
    if _display_manager is None:
        _display_manager = DisplayManager()
    return _display_manager
