use std::collections::HashSet;
use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;

use crate::utils::new_background_command;

const INVALID_CONFIGURED_CODEX_PATH_MESSAGE: &str =
    "设置的 Codex 启动路径无效。请填写 Codex.exe 或 codex/codex.exe 的完整路径，或填写包含它们的安装目录。";

/// 构造可直接启动 Codex CLI 的命令。
///
/// 重点处理 GUI 进程 PATH 不完整的问题：
/// 先定位真实可执行路径，再把其父目录注入子进程 PATH。
pub(crate) fn new_codex_command(configured_path: Option<&str>) -> Result<Command, String> {
    let normalized_configured_path = normalize_configured_path(configured_path);
    let codex_path = find_configured_codex_cli_path(normalized_configured_path.as_deref())
        .or_else(find_codex_cli_path)
        .ok_or_else(|| {
            if normalized_configured_path.is_some() {
                INVALID_CONFIGURED_CODEX_PATH_MESSAGE.to_string()
            } else {
                "未找到 codex 可执行文件。请先安装 Codex CLI，或将其所在目录加入系统 PATH。"
                    .to_string()
            }
        })?;

    let mut cmd = new_background_command(&codex_path);

    if let Some(parent) = codex_path.parent() {
        let path_entries = if let Some(current_path) = env::var_os("PATH") {
            std::iter::once(parent.to_path_buf())
                .chain(env::split_paths(&current_path))
                .collect::<Vec<_>>()
        } else {
            vec![parent.to_path_buf()]
        };
        let merged = env::join_paths(path_entries).map_err(|e| format!("设置 PATH 失败: {e}"))?;
        cmd.env("PATH", merged);
    }

    Ok(cmd)
}

pub(crate) fn validate_configured_codex_path(configured_path: Option<&str>) -> Result<(), String> {
    let normalized = normalize_configured_path(configured_path);
    let Some(path) = normalized.as_deref() else {
        return Ok(());
    };

    if find_configured_codex_app_path_from_path(Some(path)).is_some()
        || find_configured_codex_cli_path(Some(path)).is_some()
        || is_macos_app_bundle(path)
    {
        Ok(())
    } else {
        Err(INVALID_CONFIGURED_CODEX_PATH_MESSAGE.to_string())
    }
}

pub(crate) fn find_configured_codex_app_path(configured_path: Option<&str>) -> Option<PathBuf> {
    let normalized = normalize_configured_path(configured_path)?;

    find_configured_codex_app_path_from_path(Some(&normalized))
}

pub(crate) fn find_codex_app_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        return find_windows_codex_app_path();
    }

    let mut candidates = vec![
        PathBuf::from("/Applications/Codex.app"),
        PathBuf::from("/Applications/Codex Desktop.app"),
    ];

    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join("Applications").join("Codex.app"));
        candidates.push(home.join("Applications").join("Codex Desktop.app"));
    }

    if let Some(found) = candidates.into_iter().find(|path| path.exists()) {
        return Some(found);
    }

    let spotlight_queries = [
        "kMDItemFSName == 'Codex.app'",
        "kMDItemCFBundleIdentifier == 'com.openai.codex'",
    ];

    for query in spotlight_queries {
        if let Some(path) = first_spotlight_match(query) {
            return Some(path);
        }
    }

    None
}

fn find_codex_cli_path() -> Option<PathBuf> {
    let mut candidates = codex_cli_candidates();
    append_nvm_codex_candidates(&mut candidates);
    append_macos_app_bundle_codex_candidates(&mut candidates);

    let mut seen = HashSet::new();
    for candidate in candidates {
        if !seen.insert(candidate.clone()) {
            continue;
        }
        if is_executable_file(&candidate) {
            return Some(candidate);
        }
    }

    None
}

fn find_configured_codex_cli_path(configured_path: Option<&Path>) -> Option<PathBuf> {
    let configured_path = configured_path?;
    let mut candidates = Vec::new();
    append_configured_codex_candidates(&mut candidates, configured_path);

    let mut seen = HashSet::new();
    for candidate in candidates {
        if !seen.insert(candidate.clone()) {
            continue;
        }
        if is_executable_file(&candidate) {
            return Some(candidate);
        }
    }

    None
}

fn find_configured_codex_app_path_from_path(configured_path: Option<&Path>) -> Option<PathBuf> {
    let configured_path = configured_path?;

    #[cfg(target_os = "macos")]
    {
        if is_macos_app_bundle(configured_path) {
            return Some(configured_path.to_path_buf());
        }
    }

    #[cfg(target_os = "windows")]
    {
        if configured_path.is_file() && is_windows_codex_app_file(configured_path) {
            return Some(configured_path.to_path_buf());
        }

        if configured_path.is_dir() {
            let mut candidates = Vec::new();
            append_windows_codex_app_candidates_from_dir(&mut candidates, configured_path);
            append_windows_codex_app_candidates_from_dir(
                &mut candidates,
                &configured_path.join("current"),
            );
            append_windows_codex_app_candidates_from_dir(
                &mut candidates,
                &configured_path.join("app"),
            );
            append_windows_codex_app_candidates_from_dir(
                &mut candidates,
                &configured_path.join("Application"),
            );
            return first_executable_candidate(candidates);
        }
    }

    None
}

fn codex_cli_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(path_os) = env::var_os("PATH") {
        for dir in env::split_paths(&path_os) {
            push_codex_candidates_from_dir(&mut candidates, &dir);
        }
    }

    #[cfg(target_os = "macos")]
    {
        for dir in [
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
        ] {
            push_codex_candidates_from_dir(&mut candidates, &dir);
        }
    }

    if let Some(home) = dirs::home_dir() {
        for dir in [
            home.join(".local").join("bin"),
            home.join(".npm-global").join("bin"),
            home.join(".volta").join("bin"),
            home.join(".asdf").join("shims"),
            home.join(".pnpm"),
            home.join("Library").join("pnpm"),
            home.join("bin"),
            home.join("AppData")
                .join("Local")
                .join("Microsoft")
                .join("WindowsApps"),
            home.join("AppData")
                .join("Local")
                .join("Microsoft")
                .join("WinGet")
                .join("Links"),
        ] {
            push_codex_candidates_from_dir(&mut candidates, &dir);
        }
    }

    candidates
}

#[cfg(target_os = "windows")]
fn find_windows_codex_app_path() -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(local_app_data) = env::var_os("LOCALAPPDATA").map(PathBuf::from) {
        append_windows_codex_app_candidates_from_dir(
            &mut candidates,
            &local_app_data.join("Microsoft").join("WindowsApps"),
        );
        append_windows_codex_app_candidates_from_dir(
            &mut candidates,
            &local_app_data.join("Programs").join("Codex"),
        );
        append_windows_codex_app_candidates_from_dir(
            &mut candidates,
            &local_app_data.join("Programs").join("OpenAI Codex"),
        );
    }

    if let Some(home) = dirs::home_dir() {
        append_windows_codex_app_candidates_from_dir(
            &mut candidates,
            &home
                .join("AppData")
                .join("Local")
                .join("Microsoft")
                .join("WindowsApps"),
        );
    }

    append_windows_store_package_candidates(&mut candidates);
    append_where_matches(&mut candidates, &["Codex.exe", "Codex Desktop.exe"]);

    first_executable_candidate(candidates)
}

fn append_nvm_codex_candidates(candidates: &mut Vec<PathBuf>) {
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let nvm_versions_dir = home.join(".nvm").join("versions").join("node");
    let Ok(entries) = fs::read_dir(&nvm_versions_dir) else {
        return;
    };

    let mut version_dirs = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_dir())
        .collect::<Vec<_>>();
    version_dirs.sort();
    version_dirs.reverse();

    for version_dir in version_dirs {
        push_codex_candidates_from_dir(candidates, &version_dir.join("bin"));
    }
}

fn append_configured_codex_candidates(candidates: &mut Vec<PathBuf>, configured_path: &Path) {
    if configured_path.is_file() {
        if is_codex_cli_file(configured_path) {
            candidates.push(configured_path.to_path_buf());
        }
        return;
    }

    let mut search_dirs = vec![configured_path.to_path_buf()];

    if configured_path.is_dir() {
        search_dirs.push(configured_path.join("bin"));
        search_dirs.push(configured_path.join("resources"));
        search_dirs.push(configured_path.join("resources").join("bin"));
    }

    #[cfg(target_os = "macos")]
    if is_macos_app_bundle(configured_path) {
        candidates.push(
            configured_path
                .join("Contents")
                .join("Resources")
                .join("codex"),
        );
    }

    for dir in search_dirs {
        push_codex_candidates_from_dir(candidates, &dir);
    }
}

#[cfg(target_os = "macos")]
fn append_macos_app_bundle_codex_candidates(candidates: &mut Vec<PathBuf>) {
    let mut app_paths = vec![
        PathBuf::from("/Applications/Codex.app"),
        PathBuf::from("/Applications/Codex Desktop.app"),
    ];

    if let Some(home) = dirs::home_dir() {
        app_paths.push(home.join("Applications").join("Codex.app"));
        app_paths.push(home.join("Applications").join("Codex Desktop.app"));
    }

    if let Some(found) = find_codex_app_path() {
        app_paths.push(found);
    }

    for app_path in app_paths {
        candidates.push(app_path.join("Contents").join("Resources").join("codex"));
    }
}

#[cfg(not(target_os = "macos"))]
fn append_macos_app_bundle_codex_candidates(_candidates: &mut Vec<PathBuf>) {}

#[cfg(target_os = "windows")]
fn append_windows_store_package_candidates(candidates: &mut Vec<PathBuf>) {
    for root in [
        env::var_os("ProgramFiles").map(PathBuf::from),
        env::var_os("ProgramW6432").map(PathBuf::from),
        env::var_os("ProgramFiles(x86)").map(PathBuf::from),
    ]
    .into_iter()
    .flatten()
    {
        let windows_apps = root.join("WindowsApps");
        let Ok(entries) = fs::read_dir(&windows_apps) else {
            continue;
        };

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let package_name = entry.file_name().to_string_lossy().to_ascii_lowercase();
            if !package_name.contains("codex") {
                continue;
            }

            append_windows_codex_app_candidates_from_dir(candidates, &path);
            append_windows_codex_app_candidates_from_dir(candidates, &path.join("app"));
            append_windows_codex_app_candidates_from_dir(candidates, &path.join("Application"));
        }
    }
}

#[cfg(target_os = "windows")]
fn append_where_matches(candidates: &mut Vec<PathBuf>, commands: &[&str]) {
    for command in commands {
        let Ok(output) = Command::new("where.exe").arg(command).output() else {
            continue;
        };
        if !output.status.success() {
            continue;
        }

        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                candidates.push(PathBuf::from(trimmed));
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn append_windows_codex_app_candidates_from_dir(candidates: &mut Vec<PathBuf>, dir: &Path) {
    for name in ["Codex.exe", "Codex Desktop.exe"] {
        candidates.push(dir.join(name));
    }
}

fn normalize_configured_path(configured_path: Option<&str>) -> Option<PathBuf> {
    let raw = configured_path?.trim();
    if raw.is_empty() {
        return None;
    }

    let unquoted = raw
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
        .or_else(|| {
            raw.strip_prefix('\'')
                .and_then(|value| value.strip_suffix('\''))
        })
        .unwrap_or(raw)
        .trim();

    if unquoted.is_empty() {
        None
    } else {
        Some(PathBuf::from(unquoted))
    }
}

fn push_codex_candidates_from_dir(candidates: &mut Vec<PathBuf>, dir: &Path) {
    #[cfg(windows)]
    let names = ["codex.exe", "codex.cmd", "codex.bat"];
    #[cfg(not(windows))]
    let names = ["codex"];

    for name in names {
        candidates.push(dir.join(name));
    }
}

#[cfg(target_os = "windows")]
fn first_executable_candidate(candidates: Vec<PathBuf>) -> Option<PathBuf> {
    let mut seen = HashSet::new();
    for candidate in candidates {
        if !seen.insert(candidate.clone()) {
            continue;
        }
        if is_executable_file(&candidate) {
            return Some(candidate);
        }
    }
    None
}

fn is_codex_cli_file(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };

    #[cfg(windows)]
    {
        matches_ignore_ascii_case(file_name, &["codex.exe", "codex.cmd", "codex.bat"])
    }

    #[cfg(not(windows))]
    {
        file_name == "codex"
    }
}

#[cfg(target_os = "windows")]
fn is_windows_codex_app_file(path: &Path) -> bool {
    let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
        return false;
    };

    if !matches_ignore_ascii_case(file_name, &["codex.exe", "codex desktop.exe"]) {
        return false;
    }

    let normalized_path = path.to_string_lossy().to_ascii_lowercase();
    if normalized_path.contains("\\winget\\links\\")
        || normalized_path.contains("\\shims\\")
        || normalized_path.contains("\\resources\\bin\\")
    {
        return false;
    }

    let parent_name = path
        .parent()
        .and_then(|parent| parent.file_name())
        .and_then(|value| value.to_str())
        .unwrap_or_default();

    !matches_ignore_ascii_case(parent_name, &["bin"])
}

#[cfg(windows)]
fn matches_ignore_ascii_case(value: &str, candidates: &[&str]) -> bool {
    candidates
        .iter()
        .any(|candidate| value.eq_ignore_ascii_case(candidate))
}

fn is_executable_file(path: &Path) -> bool {
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

fn is_macos_app_bundle(path: &Path) -> bool {
    #[cfg(target_os = "macos")]
    {
        path.is_dir()
            && path
                .extension()
                .and_then(|value| value.to_str())
                .map(|value| value.eq_ignore_ascii_case("app"))
                .unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        false
    }
}

fn first_spotlight_match(query: &str) -> Option<PathBuf> {
    let output = Command::new("mdfind").arg(query).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| path.exists())
}
