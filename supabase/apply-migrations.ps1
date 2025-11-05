param(
    [string]$ProjectRef,
    # Prefer a direct Postgres URL to run against your cloud DB (Project Settings → Database → Connection string → URI)
    [string]$DbUrl
)

# Helper to fail on error
function ThrowOnError($message) {
    Write-Error $message
    exit 1
}

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

Write-Host "Applying SQL migrations in supabase/ ..." -ForegroundColor Cyan

Push-Location $PSScriptRoot

if ($DbUrl) {
    # Path A: Use psql against the remote DB URL (recommended, no Docker required)
    if (-not (Get-Command "psql" -ErrorAction SilentlyContinue)) {
        ThrowOnError "psql not found. Install PostgreSQL client or use the Dashboard SQL editor instead."
    }
    foreach ($f in $files) {
        $path = Join-Path $PSScriptRoot $f
        if (-not (Test-Path $path)) { Write-Warning "Skipping missing file: $f"; continue }
        Write-Host "Executing $f via psql ..." -ForegroundColor Green
        psql "$DbUrl" -v ON_ERROR_STOP=1 -f "$path"
        if ($LASTEXITCODE -ne 0) { ThrowOnError "Execution failed for $f" }
    }
}
else {
    # Path B: Use Supabase CLI. This may target your local Docker DB unless configured for remote.
    if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
        ThrowOnError "Supabase CLI not found. Install from https://supabase.com/docs/guides/cli or provide -DbUrl."
    }

    if ($ProjectRef) {
        Write-Host "Linking to project $ProjectRef..."
        supabase link --project-ref $ProjectRef
    }

    # Best effort: try to execute using the CLI. To force remote, ensure your CLI is configured to use remote DB for execute.
    foreach ($f in $files) {
        $path = Join-Path $PSScriptRoot $f
        if (-not (Test-Path $path)) { Write-Warning "Skipping missing file: $f"; continue }
        Write-Host "Executing $f via Supabase CLI ..." -ForegroundColor Green
        supabase db execute --file "$path"
        if ($LASTEXITCODE -ne 0) { ThrowOnError "Execution failed for $f" }
    }
}

Pop-Location

Write-Host "All migrations executed successfully." -ForegroundColor Cyan
