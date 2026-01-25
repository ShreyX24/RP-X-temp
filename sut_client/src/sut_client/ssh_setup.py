"""
SSH Setup Module for SUT Client.
Handles Windows OpenSSH Server setup on SUTs for bidirectional SSH with Master.
"""

import subprocess
import logging
import sys
import getpass
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger(__name__)


class SSHSetup:
    """
    Windows OpenSSH Server setup and configuration for SUTs.

    Enables Master to connect to SUTs via SSH (for trace pulling, etc.).
    Uses the current user's authorized_keys file (not admin).
    """

    def __init__(self):
        """Initialize SSH Setup."""
        self._ssh_dir = Path.home() / ".ssh"
        self._authorized_keys_path = self._ssh_dir / "authorized_keys"

    @property
    def authorized_keys_path(self) -> Path:
        """Path to authorized_keys file."""
        return self._authorized_keys_path

    def _run_powershell(self, command: str, timeout: int = 120) -> Tuple[bool, str, str]:
        """
        Run a PowerShell command and return (success, stdout, stderr).

        Args:
            command: PowerShell command to run
            timeout: Command timeout in seconds

        Returns:
            (success, stdout, stderr)
        """
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except FileNotFoundError:
            return False, "", "PowerShell not found"
        except Exception as e:
            return False, "", str(e)

    def check_openssh_installed(self) -> bool:
        """
        Check if OpenSSH Server capability is installed.

        Returns:
            True if installed
        """
        success, stdout, _ = self._run_powershell(
            "Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*' | Select-Object -ExpandProperty State"
        )
        return success and "Installed" in stdout

    def install_openssh_server(self) -> Tuple[bool, str]:
        """
        Install OpenSSH Server Windows capability.

        Returns:
            (success, message)
        """
        if sys.platform != "win32":
            return False, "Only supported on Windows"

        if self.check_openssh_installed():
            return True, "OpenSSH Server already installed"

        logger.info("Installing OpenSSH Server capability...")
        success, stdout, stderr = self._run_powershell(
            "Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0",
            timeout=300  # Installation can take a while
        )

        if success:
            logger.info("OpenSSH Server installed successfully")
            return True, "OpenSSH Server installed"
        else:
            logger.error(f"Failed to install OpenSSH Server: {stderr}")
            return False, f"Installation failed: {stderr}"

    def is_sshd_running(self) -> bool:
        """Check if sshd service is running."""
        success, stdout, _ = self._run_powershell(
            "(Get-Service sshd -ErrorAction SilentlyContinue).Status"
        )
        return success and "Running" in stdout

    def start_sshd_service(self) -> Tuple[bool, str]:
        """
        Start the sshd service.

        Returns:
            (success, message)
        """
        if self.is_sshd_running():
            return True, "sshd service already running"

        logger.info("Starting sshd service...")
        success, stdout, stderr = self._run_powershell("Start-Service sshd")

        if success:
            logger.info("sshd service started")
            return True, "sshd service started"
        else:
            logger.error(f"Failed to start sshd: {stderr}")
            return False, f"Failed to start sshd: {stderr}"

    def is_sshd_enabled(self) -> bool:
        """Check if sshd service is set to automatic startup."""
        success, stdout, _ = self._run_powershell(
            "(Get-Service sshd -ErrorAction SilentlyContinue).StartType"
        )
        return success and "Automatic" in stdout

    def enable_sshd_autostart(self) -> Tuple[bool, str]:
        """
        Set sshd service to automatic startup.

        Returns:
            (success, message)
        """
        if self.is_sshd_enabled():
            return True, "sshd already set to automatic"

        logger.info("Enabling sshd automatic startup...")
        success, stdout, stderr = self._run_powershell(
            "Set-Service -Name sshd -StartupType 'Automatic'"
        )

        if success:
            logger.info("sshd set to automatic startup")
            return True, "sshd set to automatic startup"
        else:
            logger.error(f"Failed to enable sshd autostart: {stderr}")
            return False, f"Failed to enable autostart: {stderr}"

    def set_network_profile_private(self) -> bool:
        """
        Set network profile to Private for better SSH connectivity.

        Note: This may fail without admin rights, which is acceptable.

        Returns:
            True if successful or already private
        """
        # Check current profile
        success, stdout, _ = self._run_powershell(
            "Get-NetConnectionProfile | Select-Object -ExpandProperty NetworkCategory"
        )

        if success and "Private" in stdout:
            logger.debug("Network already set to Private")
            return True

        # Try to set to Private (may fail without admin)
        logger.info("Attempting to set network profile to Private...")
        success, _, stderr = self._run_powershell(
            "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
        )

        if success:
            logger.info("Network profile set to Private")
            return True
        else:
            logger.warning(f"Could not set network to Private (may need admin): {stderr}")
            return False

    def configure_firewall_rule(self) -> Tuple[bool, str]:
        """
        Configure Windows Firewall to allow SSH on all profiles.

        Creates or updates firewall rule for SSH port 22.

        Returns:
            (success, message)
        """
        logger.info("Configuring SSH firewall rule...")

        # Check if rule already exists
        success, stdout, _ = self._run_powershell(
            "Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Enabled"
        )

        if success and "True" in stdout:
            # Update existing rule to apply to all profiles
            success, _, stderr = self._run_powershell(
                "Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Profile Any -Enabled True"
            )
            if success:
                return True, "Firewall rule updated for all profiles"
            else:
                logger.warning(f"Could not update firewall rule: {stderr}")
                return False, f"Failed to update firewall rule: {stderr}"

        # Create new rule for all profiles
        success, _, stderr = self._run_powershell(
            """
            New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' `
                -DisplayName 'OpenSSH SSH Server (sshd)' `
                -Description 'Inbound rule for OpenSSH SSH Server' `
                -Enabled True `
                -Direction Inbound `
                -Protocol TCP `
                -Action Allow `
                -LocalPort 22 `
                -Profile Any
            """
        )

        if success:
            logger.info("SSH firewall rule created for all profiles")
            return True, "Firewall rule created"
        else:
            logger.warning(f"Could not create firewall rule: {stderr}")
            return False, f"Failed to create firewall rule: {stderr}"

    def add_authorized_key(self, public_key: str) -> Tuple[bool, str]:
        """
        Add a public key to authorized_keys file.

        Uses the current user's ~/.ssh/authorized_keys.

        Args:
            public_key: Full public key line (ssh-ed25519 AAAA... comment)

        Returns:
            (success, message)
        """
        if not public_key or not public_key.strip():
            return False, "Empty public key"

        public_key = public_key.strip()

        # Validate key format
        if not (public_key.startswith("ssh-") or public_key.startswith("ecdsa-")):
            return False, "Invalid public key format"

        try:
            # Ensure .ssh directory exists with proper permissions
            self._ssh_dir.mkdir(mode=0o700, exist_ok=True)

            # Check if key already exists
            if self._authorized_keys_path.exists():
                existing = self._authorized_keys_path.read_text()
                # Extract key data (second field) for comparison
                parts = public_key.split()
                key_data = parts[1] if len(parts) >= 2 else public_key
                if key_data in existing:
                    logger.info("Master's SSH key already in authorized_keys")
                    return True, "Key already registered"

            # Append key to file
            with open(self._authorized_keys_path, "a", encoding="utf-8", newline="\n") as f:
                # Ensure we start on a new line
                if self._authorized_keys_path.exists() and self._authorized_keys_path.stat().st_size > 0:
                    # Read last char to check if we need newline
                    content = self._authorized_keys_path.read_text()
                    if content and not content.endswith("\n"):
                        f.write("\n")
                f.write(public_key + "\n")

            logger.info(f"Added Master's SSH key to authorized_keys")
            return True, "Key added successfully"

        except Exception as e:
            logger.error(f"Failed to add authorized key: {e}")
            return False, str(e)

    def remove_authorized_key(self, key_fingerprint: str) -> Tuple[bool, str]:
        """
        Remove a public key from authorized_keys by fingerprint.

        Args:
            key_fingerprint: SHA256 fingerprint of key to remove

        Returns:
            (success, message)
        """
        if not self._authorized_keys_path.exists():
            return False, "No authorized_keys file"

        try:
            lines = self._authorized_keys_path.read_text().splitlines()
            new_lines = []
            removed = False

            for line in lines:
                line = line.strip()
                if not line or line.startswith("#"):
                    new_lines.append(line)
                    continue

                # Get fingerprint of this key
                fp = self._get_fingerprint(line)
                if fp and fp == key_fingerprint:
                    removed = True
                    logger.info(f"Removing key with fingerprint: {fp}")
                else:
                    new_lines.append(line)

            if removed:
                self._authorized_keys_path.write_text("\n".join(new_lines) + "\n")
                return True, "Key removed"
            else:
                return False, "Key not found"

        except Exception as e:
            logger.error(f"Failed to remove key: {e}")
            return False, str(e)

    def _get_fingerprint(self, public_key: str) -> Optional[str]:
        """Get SHA256 fingerprint of a public key."""
        if not public_key:
            return None

        try:
            result = subprocess.run(
                ["ssh-keygen", "-lf", "-"],
                input=public_key,
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                parts = result.stdout.strip().split()
                if len(parts) >= 2:
                    return parts[1]
            return None

        except Exception as e:
            logger.error(f"Failed to get fingerprint: {e}")
            return None

    def get_status(self) -> Dict[str, Any]:
        """
        Get current SSH setup status.

        Returns:
            Dictionary with status information
        """
        authorized_keys_count = 0
        if self._authorized_keys_path.exists():
            content = self._authorized_keys_path.read_text()
            authorized_keys_count = len([
                line for line in content.splitlines()
                if line.strip() and not line.strip().startswith("#")
            ])

        return {
            "openssh_installed": self.check_openssh_installed(),
            "sshd_running": self.is_sshd_running(),
            "sshd_enabled": self.is_sshd_enabled(),
            "authorized_keys_path": str(self._authorized_keys_path),
            "authorized_keys_count": authorized_keys_count,
            "username": getpass.getuser(),
        }

    def run_full_setup(self) -> Dict[str, Any]:
        """
        Run complete SSH setup for SUT.

        Steps:
        1. Install OpenSSH Server (if not installed)
        2. Start sshd service
        3. Enable sshd autostart
        4. Configure firewall rule
        5. Try to set network to Private (optional)

        Returns:
            Dictionary with setup results
        """
        if sys.platform != "win32":
            return {
                "success": False,
                "error": "SSH setup only supported on Windows",
                "steps": []
            }

        results = {
            "success": True,
            "steps": [],
            "status": {}
        }

        # Step 1: Install OpenSSH Server
        success, msg = self.install_openssh_server()
        results["steps"].append({
            "step": "install_openssh",
            "success": success,
            "message": msg
        })
        if not success:
            results["success"] = False
            results["error"] = msg
            return results

        # Step 2: Start sshd service
        success, msg = self.start_sshd_service()
        results["steps"].append({
            "step": "start_sshd",
            "success": success,
            "message": msg
        })
        if not success:
            results["success"] = False
            results["error"] = msg
            return results

        # Step 3: Enable autostart
        success, msg = self.enable_sshd_autostart()
        results["steps"].append({
            "step": "enable_autostart",
            "success": success,
            "message": msg
        })
        if not success:
            # Non-fatal, continue
            logger.warning(f"Autostart enable failed (non-fatal): {msg}")

        # Step 4: Configure firewall
        success, msg = self.configure_firewall_rule()
        results["steps"].append({
            "step": "configure_firewall",
            "success": success,
            "message": msg
        })
        if not success:
            # Non-fatal for setup, but log warning
            logger.warning(f"Firewall configuration failed (non-fatal): {msg}")

        # Step 5: Try to set network to Private (optional)
        network_private = self.set_network_profile_private()
        results["steps"].append({
            "step": "set_network_private",
            "success": network_private,
            "message": "Network set to Private" if network_private else "Could not set network to Private (may need admin)"
        })

        # Get final status
        results["status"] = self.get_status()

        logger.info(f"SSH setup complete: {results['success']}")
        return results

    def test_ssh_connectivity(self, timeout: int = 5) -> Tuple[bool, str]:
        """
        Test if SSH port is accessible locally.

        Returns:
            (success, message)
        """
        import socket

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex(('127.0.0.1', 22))
            sock.close()

            if result == 0:
                return True, "SSH port 22 is accessible"
            else:
                return False, f"SSH port 22 not accessible (error code: {result})"

        except Exception as e:
            return False, str(e)


# Module-level singleton
_ssh_setup: Optional[SSHSetup] = None


def get_ssh_setup() -> SSHSetup:
    """Get or create the singleton SSHSetup instance."""
    global _ssh_setup
    if _ssh_setup is None:
        _ssh_setup = SSHSetup()
    return _ssh_setup
