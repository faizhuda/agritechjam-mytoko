param(
    [string]$ProjectRef
)

# Helper to fail on error
function ThrowOnError($message) {
    Write-Error $message
    exit 1
}

# Check supabase CLI
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    ThrowOnError "Supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
}

# Link if not linked yet
if ($ProjectRef) {
    Write-Host "Linking to project $ProjectRef..."
    supabase link --project-ref $ProjectRef
}

# Ensure we are linked
$status = supabase projects list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Supabase CLI may not be logged in or linked. Run 'supabase login' and 'supabase link --project-ref <ref>'."
}

Write-Host "Applying SQL migrations in supabase/ ..." -ForegroundColor Cyan

$files = @(
    "products_storage.sql",
    "products_public_read.sql",
    "products_admin_policies.sql",
    "profiles_extra_fields.sql",
    "profiles_shipping_fields.sql",
    "reviews_dedupe_then_unique.sql",
    "reviews_unique_per_user.sql",
    "reviews_public_read.sql",
    "reviews_insert_policies.sql",
    "reviews_helpful_rpc.sql",
    "orders_add_order_number.sql",
    "orders_create_rpc.sql",
    "orders_policies.sql",
    "orders_admin_read.sql",
    "wishlist_admin.sql",
    "idr_migration.sql"
)

Push-Location $PSScriptRoot
foreach ($f in $files) {
    $path = Join-Path $PSScriptRoot $f
    if (-not (Test-Path $path)) {
        Write-Warning "Skipping missing file: $f"
        continue
    }
    Write-Host "Executing $f ..." -ForegroundColor Green
    supabase db execute --file $path
    if ($LASTEXITCODE -ne 0) {
        ThrowOnError "Execution failed for $f"
    }
}
Pop-Location

Write-Host "All migrations executed successfully." -ForegroundColor Cyan
