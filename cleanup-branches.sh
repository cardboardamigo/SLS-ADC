#!/bin/bash
# =============================================================================
# SLS-ADC Branch Cleanup Script
# Run this locally to delete all stale remote branches
# =============================================================================
#
# WHAT THIS DOES:
#   Deletes 35 stale remote claude/* branches from GitHub.
#   All code is preserved in merge commit history — nothing is lost.
#
# HOW TO RUN:
#   chmod +x cleanup-branches.sh
#   ./cleanup-branches.sh
#
# =============================================================================

set -e

echo "=== SLS-ADC Branch Cleanup ==="
echo ""
echo "This will delete 35 stale remote branches from GitHub."
echo "All code is preserved in merge history. Nothing will be lost."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# --- Batch 1: Branches with PRs merged into master (PRs #1-24) ---
echo ""
echo "--- Deleting branches merged into master (PRs #1-24) ---"
MERGED_INTO_MASTER=(
    "claude/add-login-branding-JPfpR"
    "claude/add-pwa-install-button-RwRSB"
    "claude/app-icon-home-screen-WUY6Z"
    "claude/ccr-5407a085-HsosM"
    "claude/clean-ui-design-OIEZl"
    "claude/debug-session-issues-Rsq46"
    "claude/fix-gmail-login-ui-aaV0z"
    "claude/fix-login-buttons-uvqDJ"
    "claude/fix-login-improve-ui-NhhFj"
    "claude/fix-login-ui-spacing-Oryhk"
    "claude/fix-logo-login-layout-Il2NP"
    "claude/fix-pulse-animation-HrbJ8"
    "claude/fix-stop-button-unresponsive-BWPh7"
    "claude/fix-ui-layout-SUzlL"
    "claude/fix-yours-page-design-OYs4U"
    "claude/new-session-VtZkG"
    "claude/redesign-login-interface-q6xNs"
    "claude/revamp-login-system-HZsOs"
    "claude/review-login-page-28DYr"
    "claude/review-mockup-design-napkg"
    "claude/update-login-page-5W1dk"
)

for branch in "${MERGED_INTO_MASTER[@]}"; do
    echo "  Deleting $branch..."
    git push origin --delete "$branch" 2>/dev/null || echo "    (already deleted or not found)"
done

# --- Batch 2: Branches with PRs merged into census-tracker (PRs #25-37) ---
echo ""
echo "--- Deleting branches merged into census-tracker (PRs #25-37) ---"
MERGED_INTO_CENSUS=(
    "claude/architectural-audit-fMc3G"
    "claude/debug-firebase-save-P5cFO"
    "claude/fix-firebase-errors-xoAg0"
    "claude/fix-firestore-profile-save-RmNtq"
    "claude/fix-missing-logs-wITZp"
    "claude/fix-tab-loading-issues-pQeLM"
    "claude/login-page-updates-9oJyk"
    "claude/no-changes-RSHg6"
    "claude/refine-admit-discharge-pages-jipbA"
    "claude/resume-session-QWLhL"
    "claude/save-forms-firestore-JzRNd"
)

for branch in "${MERGED_INTO_CENSUS[@]}"; do
    echo "  Deleting $branch..."
    git push origin --delete "$branch" 2>/dev/null || echo "    (already deleted or not found)"
done

# --- Batch 3: Intermediate/superseded branches ---
echo ""
echo "--- Deleting intermediate/superseded branches ---"
INTERMEDIATE=(
    "claude/census-tracker-app-XZMGi"
    "claude/fix-dashboard-data-vYCAP"
    "claude/modernize-ui-design-lLLkb"
)

for branch in "${INTERMEDIATE[@]}"; do
    echo "  Deleting $branch..."
    git push origin --delete "$branch" 2>/dev/null || echo "    (already deleted or not found)"
done

echo ""
echo "=== Cleanup complete! ==="
echo ""
echo "IMPORTANT: Next steps:"
echo "  1. Go to GitHub → Settings → Branches → Default branch"
echo "  2. Change the default branch from 'claude/census-tracker-app-XZMGi' back to 'master'"
echo "  3. Then fast-forward master to include PRs #25-37:"
echo "     git checkout master"
echo "     git merge --ff-only origin/claude/census-tracker-app-XZMGi"
echo "     git push origin master"
echo ""
