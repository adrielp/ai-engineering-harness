#!/usr/bin/env bash
#
# AI Engineering Harness Setup Script
#
# This script uses GNU Stow to symlink configurations for AI agent tools
# to your home directory. Stow is the preferred method for managing dotfiles
# and configuration as it:
# - Creates symlinks without modifying original files
# - Allows easy enable/disable of configurations
# - Integrates well with version control
# - Supports multiple "packages" that can be stowed independently
#
# Usage:
#   ./setup.sh <tool> [options]
#
# Tools:
#   opencode    Install OpenCode configuration
#   claude      Install Claude Code configuration
#   all         Install all configurations
#
# Options:
#   --dry-run, -n    Show what would be done without making changes
#   --restow, -R     Restow (update) existing symlinks
#   --delete, -D     Remove symlinks (unstow)
#   --help, -h       Show this help message

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOW_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to get target directory for a tool
get_target_dir() {
    case "$1" in
        opencode)
            echo "$HOME/.config/opencode"
            ;;
        claude)
            echo "$HOME/.claude"
            ;;
        gemini)
            echo "$HOME/.gemini"
            ;;
        *)
            echo ""
            ;;
    esac
}

print_usage() {
    cat << 'EOF'
Usage:
  ./setup.sh <tool> [options]

Tools:
  opencode    Install OpenCode configuration
  claude      Install Claude Code configuration
  gemini      Install Gemini CLI configuration
  all         Install all configurations

Options:
  --dry-run, -n    Show what would be done without making changes
  --restow, -R     Restow (update) existing symlinks
  --delete, -D     Remove symlinks (unstow)
  --help, -h       Show this help message

Examples:
  ./setup.sh opencode              # Install OpenCode
  ./setup.sh claude --dry-run      # Preview Claude Code installation
  ./setup.sh gemini                # Install Gemini CLI
  ./setup.sh all --restow          # Update all configurations
  ./setup.sh opencode --delete     # Remove OpenCode symlinks
EOF
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_stow() {
    if ! command -v stow &> /dev/null; then
        log_error "GNU Stow is not installed."
        echo ""
        echo "Install it using your package manager:"
        echo "  macOS:   brew install stow"
        echo "  Ubuntu:  sudo apt install stow"
        echo "  Fedora:  sudo dnf install stow"
        echo "  Arch:    sudo pacman -S stow"
        exit 1
    fi
    log_success "GNU Stow found: $(which stow)"
}

check_conflicts() {
    local package="$1"
    local target_dir="$2"
    local has_conflicts=false
    
    log_info "Checking for conflicts with '$package'..."
    
    # Find all files in the package directory
    while IFS= read -r -d '' file; do
        rel_path="${file#$STOW_DIR/$package/}"
        target_path="$target_dir/$rel_path"
        
        if [[ -e "$target_path" ]] && [[ ! -L "$target_path" ]]; then
            log_warn "Conflict: $target_path exists and is not a symlink"
            has_conflicts=true
        fi
    done < <(find "$STOW_DIR/$package" -type f -print0 2>/dev/null)
    
    if [[ "$has_conflicts" == "true" ]]; then
        echo ""
        log_warn "Existing files found. Options:"
        echo "  1. Back up and remove the conflicting files"
        echo "  2. Use '--adopt' with stow to adopt existing files into this repo"
        echo "  3. Manually merge configurations"
        return 1
    fi
    
    return 0
}

stow_package() {
    local package="$1"
    local target_dir="$2"
    local stow_opts="${3:-}"
    
    if [[ ! -d "$STOW_DIR/$package" ]]; then
        log_warn "Package '$package' not found, skipping..."
        return 0
    fi
    
    # Ensure target directory exists
    if [[ ! -d "$target_dir" ]]; then
        log_info "Creating target directory: $target_dir"
        mkdir -p "$target_dir"
    fi
    
    log_info "Stowing '$package' to $target_dir..."
    
    # shellcheck disable=SC2086
    if stow $stow_opts --dir="$STOW_DIR" --target="$target_dir" "$package"; then
        log_success "Successfully stowed '$package'"
    else
        log_error "Failed to stow '$package'"
        return 1
    fi
}

unstow_package() {
    local package="$1"
    local target_dir="$2"
    local stow_opts="${3:-}"
    
    if [[ ! -d "$STOW_DIR/$package" ]]; then
        log_warn "Package '$package' not found, skipping..."
        return 0
    fi
    
    log_info "Unstowing '$package' from $target_dir..."
    
    # shellcheck disable=SC2086
    if stow $stow_opts --delete --dir="$STOW_DIR" --target="$target_dir" "$package"; then
        log_success "Successfully unstowed '$package'"
    else
        log_error "Failed to unstow '$package'"
        return 1
    fi
}

process_tool() {
    local tool="$1"
    local action="$2"
    local restow="$3"
    local dry_run="$4"
    
    local target_dir=$(get_target_dir "$tool")
    
    if [[ -z "$target_dir" ]]; then
        log_error "Unknown tool: $tool"
        return 1
    fi
    
    case "$action" in
        stow)
            if [[ "$restow" == "true" ]]; then
                stow_package "$tool" "$target_dir" "--restow $dry_run"
            else
                if check_conflicts "$tool" "$target_dir"; then
                    stow_package "$tool" "$target_dir" "$dry_run"
                else
                    log_error "Please resolve conflicts before stowing '$tool'"
                fi
            fi
            ;;
        unstow)
            unstow_package "$tool" "$target_dir" "$dry_run"
            ;;
    esac
}

main() {
    local dry_run=""
    local action="stow"
    local restow=false
    local tool=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--dry-run)
                dry_run="--simulate"
                shift
                ;;
            -R|--restow)
                restow=true
                shift
                ;;
            -D|--delete)
                action="unstow"
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            opencode|claude|gemini|all)
                tool="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    # Check if tool was specified
    if [[ -z "$tool" ]]; then
        log_error "No tool specified"
        echo ""
        print_usage
        exit 1
    fi
    
    echo ""
    echo "=========================================="
    echo "   AI Engineering Harness Setup"
    echo "=========================================="
    echo ""
    
    check_stow
    echo ""
    
    log_info "Stow directory: $STOW_DIR"
    
    if [[ -n "$dry_run" ]]; then
        log_warn "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    # Process tools
    if [[ "$tool" == "all" ]]; then
        log_info "Installing all tools..."
        echo ""
        for t in opencode claude gemini; do
            process_tool "$t" "$action" "$restow" "$dry_run"
            echo ""
        done
    else
        log_info "Installing: $tool"
        echo ""
        process_tool "$tool" "$action" "$restow" "$dry_run"
        echo ""
    fi
    
    log_success "Setup complete!"
    echo ""
    
    if [[ "$action" == "stow" ]]; then
        echo "Your AI harness configuration is now linked:"
        if [[ "$tool" == "all" ]]; then
            for t in opencode claude gemini; do
                local target=$(get_target_dir "$t")
                echo "  $target/ -> $STOW_DIR/$t/"
            done
        else
            local target=$(get_target_dir "$tool")
            echo "  $target/ -> $STOW_DIR/$tool/"
        fi
        echo ""
        echo "Next steps:"
        echo "  1. Review and customize configurations in this repo"
        echo "  2. Initialize your project with /init-harness (OpenCode, Claude Code, Gemini CLI)"
        echo "  3. Start using your AI tool with configured agents, commands, and skills"
    else
        echo "Symlinks have been removed."
    fi
    echo ""
}

main "$@"
