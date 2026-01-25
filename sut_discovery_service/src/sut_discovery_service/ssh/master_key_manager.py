"""
Master Key Manager for SUT Discovery Service.
Manages the Master's SSH key pair for connecting to SUTs.
"""

import subprocess
import socket
import logging
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class MasterKeyManager:
    """
    Manages Master's SSH key pair for connecting to SUTs.

    The Master needs its own SSH key to:
    - Connect to SUTs for trace pulling
    - Push commands/files to SUTs
    - General Master->SUT SSH access

    Uses a dedicated key (master_ed25519) separate from user's default key.
    """

    # Use a dedicated key for Master operations
    KEY_NAME = "master_ed25519"

    def __init__(self, key_dir: Path = None):
        """
        Initialize Master Key Manager.

        Args:
            key_dir: Directory for SSH keys (defaults to ~/.ssh)
        """
        self._ssh_dir = key_dir or (Path.home() / ".ssh")
        self._key_path = self._ssh_dir / self.KEY_NAME
        self._pub_key_path = self._ssh_dir / f"{self.KEY_NAME}.pub"

    @property
    def key_path(self) -> Path:
        """Path to private key."""
        return self._key_path

    @property
    def public_key_path(self) -> Path:
        """Path to public key."""
        return self._pub_key_path

    def ensure_key_exists(self) -> Tuple[bool, str]:
        """
        Ensure Master's SSH key pair exists, generating if necessary.

        Returns:
            (success, message)
        """
        if self._key_path.exists() and self._pub_key_path.exists():
            logger.debug(f"Master SSH key already exists: {self._key_path}")
            return True, "Key already exists"

        # Ensure .ssh directory exists with proper permissions
        try:
            self._ssh_dir.mkdir(mode=0o700, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create .ssh directory: {e}")
            return False, f"Failed to create .ssh directory: {e}"

        # Generate Ed25519 key pair (no passphrase)
        hostname = socket.gethostname()
        comment = f"master@{hostname}"

        try:
            result = subprocess.run([
                "ssh-keygen",
                "-t", "ed25519",
                "-N", "",  # No passphrase
                "-f", str(self._key_path),
                "-C", comment
            ], capture_output=True, text=True, timeout=30)

            if result.returncode != 0:
                error = result.stderr.strip() or result.stdout.strip()
                logger.error(f"ssh-keygen failed: {error}")
                return False, f"Key generation failed: {error}"

            logger.info(f"Generated Master SSH key pair: {self._key_path}")
            return True, f"Generated new key: {comment}"

        except FileNotFoundError:
            logger.error("ssh-keygen not found - OpenSSH client not installed?")
            return False, "ssh-keygen not found"
        except subprocess.TimeoutExpired:
            logger.error("ssh-keygen timed out")
            return False, "Key generation timed out"
        except Exception as e:
            logger.error(f"Key generation error: {e}")
            return False, str(e)

    def get_public_key(self) -> Optional[str]:
        """
        Read and return the public key content.

        Automatically ensures key exists before reading.

        Returns:
            Public key string (e.g., "ssh-ed25519 AAAA... comment")
            or None if not available
        """
        # Ensure key exists
        success, msg = self.ensure_key_exists()
        if not success:
            logger.warning(f"Could not ensure key exists: {msg}")
            return None

        if not self._pub_key_path.exists():
            logger.warning(f"Public key not found: {self._pub_key_path}")
            return None

        try:
            content = self._pub_key_path.read_text().strip()
            logger.debug(f"Read Master public key: {content[:50]}...")
            return content
        except Exception as e:
            logger.error(f"Failed to read public key: {e}")
            return None

    def get_fingerprint(self) -> Optional[str]:
        """
        Get SHA256 fingerprint of the Master's key.

        Returns:
            Fingerprint string (e.g., "SHA256:abc123...")
            or None if not available
        """
        # Ensure key exists
        success, msg = self.ensure_key_exists()
        if not success:
            return None

        if not self._key_path.exists():
            return None

        try:
            result = subprocess.run(
                ["ssh-keygen", "-lf", str(self._key_path)],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                # Output format: "256 SHA256:xxx comment (ED25519)"
                parts = result.stdout.strip().split()
                if len(parts) >= 2:
                    return parts[1]
            return None

        except Exception as e:
            logger.error(f"Failed to get fingerprint: {e}")
            return None

    def get_key_info(self) -> dict:
        """
        Get information about the Master's SSH key.

        Returns:
            Dictionary with key info
        """
        exists = self._key_path.exists() and self._pub_key_path.exists()

        return {
            "exists": exists,
            "private_key_path": str(self._key_path),
            "public_key_path": str(self._pub_key_path),
            "fingerprint": self.get_fingerprint() if exists else None,
            "public_key": self.get_public_key() if exists else None,
        }

    def test_connection(
        self,
        sut_ip: str,
        username: str = None,
        timeout: int = 10
    ) -> Tuple[bool, str]:
        """
        Test SSH connection to a SUT.

        Args:
            sut_ip: SUT IP address
            username: SSH username (defaults to current user)
            timeout: Connection timeout in seconds

        Returns:
            (success, message)
        """
        import getpass

        # Ensure key exists
        success, msg = self.ensure_key_exists()
        if not success:
            return False, f"Master key not available: {msg}"

        if username is None:
            username = getpass.getuser()

        try:
            result = subprocess.run([
                "ssh",
                "-i", str(self._key_path),  # Use Master's key
                "-o", "BatchMode=yes",  # No interactive prompts
                "-o", "StrictHostKeyChecking=no",  # Accept new host keys
                "-o", "UserKnownHostsFile=/dev/null",  # Don't save host keys
                "-o", f"ConnectTimeout={timeout}",
                f"{username}@{sut_ip}",
                "echo SSH_OK"
            ], capture_output=True, text=True, timeout=timeout + 5)

            if result.returncode == 0 and "SSH_OK" in result.stdout:
                logger.info(f"SSH connection to {sut_ip} successful")
                return True, "Connection successful"
            else:
                error = result.stderr.strip() or "Connection failed"
                logger.warning(f"SSH connection to {sut_ip} failed: {error}")
                return False, error

        except subprocess.TimeoutExpired:
            return False, "Connection timed out"
        except Exception as e:
            return False, str(e)

    def execute_on_sut(
        self,
        sut_ip: str,
        command: str,
        username: str = None,
        timeout: int = 30
    ) -> Tuple[bool, str, str]:
        """
        Execute a command on a SUT via SSH.

        Args:
            sut_ip: SUT IP address
            command: Command to execute
            username: SSH username (defaults to current user)
            timeout: Command timeout in seconds

        Returns:
            (success, stdout, stderr)
        """
        import getpass

        # Ensure key exists
        success, msg = self.ensure_key_exists()
        if not success:
            return False, "", f"Master key not available: {msg}"

        if username is None:
            username = getpass.getuser()

        try:
            result = subprocess.run([
                "ssh",
                "-i", str(self._key_path),
                "-o", "BatchMode=yes",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "-o", f"ConnectTimeout={timeout}",
                f"{username}@{sut_ip}",
                command
            ], capture_output=True, text=True, timeout=timeout + 5)

            return result.returncode == 0, result.stdout, result.stderr

        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)


# Module-level singleton
_master_key_manager: Optional[MasterKeyManager] = None


def get_master_key_manager() -> MasterKeyManager:
    """Get or create the singleton MasterKeyManager instance."""
    global _master_key_manager
    if _master_key_manager is None:
        _master_key_manager = MasterKeyManager()
    return _master_key_manager
