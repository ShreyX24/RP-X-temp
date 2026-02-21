# Restarter: Launch Mode Persistence — Learnings

> **Last Updated**: 2026-02-21
> **Purpose**: Document the restarter rewrite, Windows process pitfalls, and batch scripting traps

---

## Feature Summary

After push-based SUT client updates, `restarter.bat` now remembers and restores the launch flags (e.g. `--debug`). The `/restart` endpoint also accepts an optional mode override (`{"mode": "debug"}` or `{"mode": "raptor"}`). If no mode is specified, the restarter uses whatever was last saved — preserving the user's launch config across updates.

### Files Modified
1. **`sut_client/src/sut_client/__init__.py`** — `_save_launch_mode(args)` writes `launch_mode.json` + `launch_cmd.txt` on every normal startup (after admin elevation, before service start)
2. **`sut_client/src/sut_client/service.py`** — `/restart` accepts `{"mode": "debug"|"raptor"}`, updates mode files before spawning restarter; uses `CREATE_BREAKAWAY_FROM_JOB` flag
3. **`sut_client/restarter.bat`** — Reads `launch_cmd.txt` via `set /p`, health-check loop (polls `/health` up to 24x before closing), logging to `restarter.log`
4. **`rpx-core/backend/communication/sut_client.py`** — `restart(mode=None)` forwards mode as JSON body

### Mode Files (next to `pyproject.toml` in sut_client root)
- **`launch_mode.json`**: `{"mode": "debug", "command": "sut-client", "args": ["--debug"]}` — structured data for API consumers
- **`launch_cmd.txt`**: `sut-client --debug` — plain text for batch `set /p` (avoids quoting issues)

---

## Critical Bugs Found & Fixed

### 1. OpenSSH Job Object Kills Restarter (ROOT CAUSE — hardest to find)

**Date Learned**: 2026-02-21

**Context**: The restarter is spawned by the Flask service (inside `sut-client.exe`) via `subprocess.Popen`. Its first job is to kill `sut-client.exe`. But the restarter kept dying silently right at the `taskkill` step.

**Problem**: When sut-client is started via SSH, **OpenSSH for Windows wraps all child processes in a job object**. When `taskkill /F /IM "sut-client.exe"` kills the main process, the job object terminates ALL children in the group — including the restarter that just issued the kill command.

**Symptom**: `restarter.log` stops at Step 2 `"Killing processes..."` with no further output. No sut-client, python, or cmd.exe processes running afterward. The restarter simply vanishes.

**Fix**: Spawn the restarter with `CREATE_BREAKAWAY_FROM_JOB` (0x01000000) flag to escape the SSH job object:
```python
CREATE_BREAKAWAY_FROM_JOB = 0x01000000
subprocess.Popen(
    ["cmd", "/c", str(restarter)],
    creationflags=subprocess.CREATE_NEW_CONSOLE | CREATE_BREAKAWAY_FROM_JOB,
    close_fds=True,
)
```

**Key Insight**: `CREATE_NEW_CONSOLE` alone is NOT enough — it creates a new console but the process stays in the parent's job object. You need `CREATE_BREAKAWAY_FROM_JOB` to fully detach. Also note: `DETACHED_PROCESS` + `CREATE_NEW_CONSOLE` = WinError 87 (mutually exclusive flags).

---

### 2. Window Title Taskkill Kills Restarter or Its Parent

**Date Learned**: 2026-02-21

**Context**: Added `taskkill /FI "WINDOWTITLE eq SUT Client*"` to kill orphaned terminal windows from the previous session.

**Problem**: The `WINDOWTITLE` filter is a **substring wildcard match**:
- `"SUT Client*"` matched the restarter's own window (originally titled `"RPX SUT Client Restarter"`)
- `"sut-client*"` matched the parent cmd.exe whose title was set to `"sut-client"` by `_set_window_title()` in `__init__.py`

Both cases killed the restarter or its parent process, halting the restart.

**Fix**:
- Changed restarter window title to `RPX Restarter` (doesn't match either pattern)
- Removed window-title-based taskkill entirely — process-name kills (`taskkill /IM "sut-client.exe"`) are sufficient; the old terminal window closes automatically when its hosted process dies

**Key Insight**: `taskkill /FI "WINDOWTITLE eq Pattern*"` is dangerous in batch scripts — the `*` wildcard can match your own window or parent windows you didn't intend to kill.

---

### 3. Batch `for /f` Single-Quote Nesting Breaks Script Silently

**Date Learned**: 2026-02-21

**Context**: Used a Python one-liner inside `for /f` to read `launch_mode.json` and extract the launch command.

**Problem**: `for /f 'command'` uses single quotes to delimit the command. Any single quotes inside the Python code conflict with the batch delimiter:
```bat
REM BROKEN — inner ' closes the for /f command string
for /f "delims=" %%a in ('python -c "...Path(r'%SCRIPT_DIR%')/'launch_mode.json'..."') do ...
```
The batch parser sees the first inner `'` as closing the command string. This causes a **silent syntax error** — the script aborts at that line with no error message, and subsequent steps never execute.

**Fix**: Avoid single quotes entirely. Write a plain text file (`launch_cmd.txt`) alongside the JSON and read it with the simple, robust `set /p`:
```bat
set /p LAUNCH_CMD=<"%SCRIPT_DIR%launch_cmd.txt"
if not defined LAUNCH_CMD set "LAUNCH_CMD=sut-client"
```

**Key Insight**: Never use Python one-liners with single quotes inside `for /f 'command'`. If you need complex parsing, write a helper `.py` file or use a simpler data format that batch can read natively.

---

### 4. Batch `)` Inside `if/else` Blocks Closes Block Early

**Date Learned**: 2026-02-21

**Context**: Added an informative error message with the pip exit code inside an `else` block.

**Problem**: Parentheses in echo text inside `if (...) else (...)` blocks are interpreted as block delimiters:
```bat
) else (
    echo  pip failed (exit code %ERRORLEVEL%) - continuing
                     ^-- this ) closes the else block prematurely!
)   <-- this ) is now orphaned, causing a syntax error
```
The batch parser sees the `)` in `(exit code ...)` as closing the `else` block. The script aborts silently.

**Fix**: Either:
- Escape parentheses with `^(` and `^)`: `echo pip failed ^(exit code %ERRORLEVEL%^)`
- Move the echo outside the `if/else` block
- Use `!ERRORLEVEL!` on standalone lines

---

## Batch Script Best Practices (Windows)

### Variable Expansion
- Always use `setlocal EnableDelayedExpansion` when variables change inside `for` loops or `if` blocks
- Use `!VAR!` (delayed expansion) inside loops/blocks, `%VAR%` on standalone lines
- `%ERRORLEVEL%` is evaluated at **parse time** — inside a block `(...)`, it gets the value from BEFORE the block was entered. Use `!ERRORLEVEL!` instead.

### Quoting & Special Characters
- Never use `(` or `)` in echo text inside `if/else` blocks — they break the block parser
- Never nest single quotes inside `for /f 'command'` — use `usebackq` with backticks or helper files
- `%~dp0` always has a trailing backslash — e.g. `C:\path\to\dir\` — beware when appending filenames

### Process Management
- `taskkill /FI "WINDOWTITLE eq pattern*"` is substring match — check your own window title first
- `cmd /c script.bat` can abort on certain errors — use `cmd /k` during debugging to keep window open
- Restarter window title must NOT match any kill pattern it uses

### Debugging
- Add logging to a file (`>> "%LOG_FILE%"`) at each step boundary — batch errors are silent
- Use `cmd /k` instead of `cmd /c` during debugging to keep the window open after failures
- Replace `exit` with `pause` during debugging to inspect final state

---

## Windows Process Model Gotchas

### OpenSSH Job Objects
- **All processes spawned inside an SSH session share a job object**
- Killing the main process triggers the job object to terminate all children
- `CREATE_NEW_CONSOLE` alone does NOT escape the job — only `CREATE_BREAKAWAY_FROM_JOB` does
- This also applies to scheduled tasks and other process managers that use job objects

### Process Creation Flags (mutually exclusive combos)
| Flags | Result |
|-------|--------|
| `CREATE_NEW_CONSOLE` | New console, same job |
| `CREATE_NEW_CONSOLE \| CREATE_BREAKAWAY_FROM_JOB` | New console, independent process |
| `DETACHED_PROCESS` | No console, same job |
| `DETACHED_PROCESS \| CREATE_NEW_CONSOLE` | **WinError 87** — mutually exclusive |

### Restarter Architecture
The restarter must be a **fully independent process** because it needs to:
1. Kill its own parent (sut-client.exe)
2. Survive the parent's death
3. Reinstall the package
4. Launch a new sut-client instance
5. Verify the new instance is healthy
6. Close itself

This requires: `CREATE_NEW_CONSOLE | CREATE_BREAKAWAY_FROM_JOB` — anything less and the restarter dies with its parent.
