use std::env;
use std::ffi::OsString;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::time::SystemTime;
use std::time::UNIX_EPOCH;

pub(crate) fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

pub(crate) fn short_account(account_id: &str) -> String {
    account_id.chars().take(8).collect()
}

pub(crate) fn truncate_for_error(value: &str, max_len: usize) -> String {
    if value.len() <= max_len {
        value.to_string()
    } else {
        format!("{}...", &value[..max_len])
    }
}

pub(crate) fn set_private_permissions(path: &Path) {
    let _ = try_set_private_permissions(path);
}

pub(crate) fn try_set_private_permissions(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let mut permissions = fs::metadata(path)
            .map_err(|error| format!("读取文件权限失败 {}: {error}", path.display()))?
            .permissions();
        permissions.set_mode(0o600);
        fs::set_permissions(path, permissions)
            .map_err(|error| format!("设置文件权限失败 {}: {error}", path.display()))?;
        Ok(())
    }

    #[cfg(windows)]
    {
        tighten_windows_private_file_acl(path)
    }

    #[cfg(not(any(unix, windows)))]
    {
        let _ = path;
        Ok(())
    }
}

#[cfg(windows)]
fn tighten_windows_private_file_acl(path: &Path) -> Result<(), String> {
    let escaped_path = path.to_string_lossy().replace('\'', "''");
    let script = format!(
        r#"
$ErrorActionPreference = 'Stop'
$Path = '{escaped_path}'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$acl = Get-Acl -LiteralPath $Path
$acl.SetAccessRuleProtection($true, $false)
foreach ($rule in @($acl.Access)) {{
    [void]$acl.RemoveAccessRuleAll($rule)
}}
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $identity.User,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow
)
$acl.AddAccessRule($accessRule)
Set-Acl -LiteralPath $Path -AclObject $acl
"#
    );

    let output = new_resolved_command("powershell")
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(script)
        .output()
        .map_err(|error| {
            format!(
                "调用 PowerShell 设置私有文件权限失败 {}: {error}",
                path.display()
            )
        })?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("退出码 {:?}", output.status.code())
        };
        Err(format!(
            "设置 Windows 私有文件 ACL 失败 {}: {detail}",
            path.display()
        ))
    }
}

pub(crate) fn prepare_process_path() {
    let mut merged = preferred_executable_dirs();
    if let Some(current_path) = env::var_os("PATH") {
        for dir in env::split_paths(&current_path) {
            push_unique_dir(&mut merged, dir);
        }
    }

    if let Ok(path_env) = env::join_paths(merged) {
        env::set_var("PATH", path_env);
    }
}

pub(crate) fn find_command_path(command: &str) -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(path_os) = env::var_os("PATH") {
        for dir in env::split_paths(&path_os) {
            push_command_candidates_from_dir(&mut candidates, &dir, command);
        }
    }

    for dir in preferred_executable_dirs() {
        push_command_candidates_from_dir(&mut candidates, &dir, command);
    }

    candidates.into_iter().find(|path| is_executable_file(path))
}

pub(crate) fn new_resolved_command(command: &str) -> Command {
    let program = find_command_path(command).unwrap_or_else(|| PathBuf::from(command));
    let mut command = Command::new(&program);
    if let Some(parent) = program.parent().filter(|_| program.is_absolute()) {
        if let Some(path_env) = prepend_path_entry(parent) {
            command.env("PATH", path_env);
        }
    }
    command
}

pub(crate) fn prepend_path_entry(path: &Path) -> Option<OsString> {
    let mut paths = vec![path.to_path_buf()];
    if let Some(existing) = env::var_os("PATH") {
        paths.extend(env::split_paths(&existing));
    }
    env::join_paths(paths).ok()
}

pub(crate) fn is_executable_file(path: &Path) -> bool {
    let Ok(metadata) = fs::metadata(path) else {
        return false;
    };
    if !metadata.is_file() {
        return false;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        metadata.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

fn preferred_executable_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    #[cfg(target_os = "macos")]
    {
        for dir in [
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/opt/homebrew/sbin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/local/sbin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/bin"),
            PathBuf::from("/usr/sbin"),
            PathBuf::from("/sbin"),
            PathBuf::from("/Library/Apple/usr/bin"),
        ] {
            push_unique_dir(&mut dirs, dir);
        }
    }

    if let Some(home) = dirs::home_dir() {
        for dir in [
            home.join(".cargo").join("bin"),
            home.join(".local").join("bin"),
            home.join("bin"),
            home.join(".asdf").join("shims"),
            home.join(".volta").join("bin"),
            home.join(".npm-global").join("bin"),
            home.join("Library").join("pnpm"),
            home.join("AppData")
                .join("Local")
                .join("Microsoft")
                .join("WinGet")
                .join("Links"),
        ] {
            push_unique_dir(&mut dirs, dir);
        }
    }

    dirs
}

fn push_unique_dir(dirs: &mut Vec<PathBuf>, candidate: PathBuf) {
    if candidate.is_dir() && !dirs.iter().any(|existing| existing == &candidate) {
        dirs.push(candidate);
    }
}

fn push_command_candidates_from_dir(candidates: &mut Vec<PathBuf>, dir: &Path, command: &str) {
    #[cfg(windows)]
    {
        for name in [
            format!("{command}.exe"),
            format!("{command}.cmd"),
            format!("{command}.bat"),
        ] {
            candidates.push(dir.join(name));
        }
    }

    #[cfg(not(windows))]
    {
        candidates.push(dir.join(command));
    }
}
