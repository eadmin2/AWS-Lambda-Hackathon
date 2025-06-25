$projectRef = $args[0]
if (-not $projectRef) {
    Write-Error "Please provide the project ref as an argument"
    exit 1
}

Write-Host "Deploying notify-condition-updates function..."
npx supabase functions deploy notify-condition-updates --project-ref $projectRef --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to deploy function"
    exit 1
}
Write-Host "Function deployed successfully!" 