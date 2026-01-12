#!/usr/bin/env python3
"""
RAPTOR X Banner Color Picker
Interactive tool to customize the SUT Client banner gradient colors.
"""

import sys
import os

# Enable ANSI colors on Windows
if sys.platform == "win32":
    import ctypes
    kernel32 = ctypes.windll.kernel32
    handle = kernel32.GetStdHandle(-11)
    mode = ctypes.c_ulong()
    kernel32.GetConsoleMode(handle, ctypes.byref(mode))
    kernel32.SetConsoleMode(handle, mode.value | 0x0004)

RESET = "\033[0m"

BANNER_LINES = [
    "██████╗  █████╗ ██████╗ ████████╗ ██████╗ ██████╗     ██╗  ██╗",
    "██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗    ╚██╗██╔╝",
    "██████╔╝███████║██████╔╝   ██║   ██║   ██║██████╔╝     ╚███╔╝",
    "██╔══██╗██╔══██║██╔═══╝    ██║   ██║   ██║██╔══██╗     ██╔██╗",
    "██║  ██║██║  ██║██║        ██║   ╚██████╔╝██║  ██║    ██╔╝ ██╗",
    "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝        ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝",
]

# Current gradient colors (default: purple to white)
current_colors = [93, 135, 141, 183, 189, 231]

# Some preset gradients to try
PRESETS = {
    "purple_white": [93, 135, 141, 183, 189, 231],
    "cyan_white": [51, 87, 123, 159, 195, 231],
    "red_yellow": [196, 202, 208, 214, 220, 226],
    "green_cyan": [46, 48, 50, 51, 87, 123],
    "blue_purple": [21, 57, 93, 129, 165, 201],
    "orange_yellow": [208, 214, 220, 226, 227, 231],
    "pink_white": [199, 205, 211, 217, 223, 231],
    "fire": [196, 202, 208, 214, 220, 226],
    "ocean": [17, 18, 19, 20, 21, 27],
    "forest": [22, 28, 34, 40, 46, 82],
    "sunset": [196, 202, 208, 214, 220, 226],
    "neon": [201, 165, 129, 93, 57, 21],
    "rainbow": [196, 208, 226, 46, 51, 201],
}


def clear_screen():
    os.system('cls' if sys.platform == 'win32' else 'clear')


def print_color_palette():
    """Print all 256 colors in a grid"""
    print("\n\033[1m=== 256 COLOR PALETTE ===\033[0m\n")

    # Standard colors (0-15)
    print("Standard colors (0-15):")
    for i in range(16):
        print(f"\033[48;5;{i}m {i:3} {RESET}", end="")
        if (i + 1) % 8 == 0:
            print()
    print()

    # 216 colors (16-231)
    print("\n216 colors (16-231):")
    for i in range(16, 232):
        print(f"\033[48;5;{i}m{i:4}{RESET}", end="")
        if (i - 16 + 1) % 18 == 0:
            print()
    print()

    # Grayscale (232-255)
    print("\nGrayscale (232-255):")
    for i in range(232, 256):
        print(f"\033[48;5;{i}m{i:4}{RESET}", end="")
    print("\n")


def print_banner_preview():
    """Print the banner with current colors"""
    print("\n\033[1m=== CURRENT BANNER PREVIEW ===\033[0m\n")
    for i, line in enumerate(BANNER_LINES):
        color = current_colors[i] if i < len(current_colors) else 231
        print(f"\033[38;5;{color}m{line}{RESET}  <- color {color}")
    print()
    version_text = "SUT Client v0.3.0"
    padding = (len(BANNER_LINES[0]) - len(version_text)) // 2
    print(f"\033[97m{' ' * padding}{version_text}{RESET}")
    print()
    print(f"Current colors: {current_colors}")
    print()


def print_presets():
    """Show available presets"""
    print("\n\033[1m=== PRESET GRADIENTS ===\033[0m\n")
    for name, colors in PRESETS.items():
        # Show a color bar preview
        bar = ""
        for c in colors:
            bar += f"\033[48;5;{c}m  {RESET}"
        print(f"  {name:15} {bar}  {colors}")
    print()


def apply_preset(name):
    """Apply a preset gradient"""
    global current_colors
    if name in PRESETS:
        current_colors = PRESETS[name].copy()
        print(f"\nApplied preset: {name}")
    else:
        print(f"\nPreset '{name}' not found!")


def set_color(row, color):
    """Set a specific row's color"""
    global current_colors
    if 0 <= row < 6 and 0 <= color <= 255:
        current_colors[row] = color
        print(f"\nSet row {row + 1} to color {color}")
    else:
        print("\nInvalid row (1-6) or color (0-255)")


def generate_gradient(start_color, end_color):
    """Generate a simple gradient between two colors"""
    # This is a simplified gradient - just linear interpolation of color codes
    # Real gradients would need RGB interpolation
    global current_colors
    step = (end_color - start_color) / 5
    current_colors = [int(start_color + step * i) for i in range(6)]
    print(f"\nGenerated gradient from {start_color} to {end_color}: {current_colors}")


def export_colors():
    """Export the current colors for use in __init__.py"""
    print("\n\033[1m=== EXPORT ===\033[0m")
    print("\nCopy this line to sut_client/src/sut_client/__init__.py:\n")
    print(f"GRADIENT_COLORS = {current_colors}")
    print()


def main():
    clear_screen()

    print("""
\033[1m╔═══════════════════════════════════════════════════════════════╗
║           RAPTOR X BANNER COLOR PICKER                        ║
╚═══════════════════════════════════════════════════════════════╝\033[0m
    """)

    while True:
        print("\n\033[1mCommands:\033[0m")
        print("  palette     - Show all 256 colors")
        print("  preview     - Preview banner with current colors")
        print("  presets     - Show preset gradients")
        print("  use <name>  - Apply a preset (e.g., 'use cyan_white')")
        print("  set <row> <color> - Set row color (e.g., 'set 1 196')")
        print("  gradient <start> <end> - Generate gradient")
        print("  export      - Export colors for __init__.py")
        print("  clear       - Clear screen")
        print("  quit        - Exit")

        try:
            cmd = input("\n\033[96m>\033[0m ").strip().lower().split()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not cmd:
            continue

        if cmd[0] == "quit" or cmd[0] == "q" or cmd[0] == "exit":
            print("\nGoodbye!")
            break
        elif cmd[0] == "palette" or cmd[0] == "p":
            print_color_palette()
        elif cmd[0] == "preview" or cmd[0] == "v":
            print_banner_preview()
        elif cmd[0] == "presets":
            print_presets()
        elif cmd[0] == "use" and len(cmd) > 1:
            apply_preset(cmd[1])
            print_banner_preview()
        elif cmd[0] == "set" and len(cmd) >= 3:
            try:
                row = int(cmd[1]) - 1  # 1-indexed for user
                color = int(cmd[2])
                set_color(row, color)
                print_banner_preview()
            except ValueError:
                print("Invalid numbers. Usage: set <row 1-6> <color 0-255>")
        elif cmd[0] == "gradient" or cmd[0] == "g":
            if len(cmd) >= 3:
                try:
                    start = int(cmd[1])
                    end = int(cmd[2])
                    generate_gradient(start, end)
                    print_banner_preview()
                except ValueError:
                    print("Invalid numbers. Usage: gradient <start> <end>")
            else:
                print("Usage: gradient <start_color> <end_color>")
        elif cmd[0] == "export" or cmd[0] == "e":
            export_colors()
        elif cmd[0] == "clear" or cmd[0] == "c":
            clear_screen()
        else:
            print(f"Unknown command: {cmd[0]}")


if __name__ == "__main__":
    main()
