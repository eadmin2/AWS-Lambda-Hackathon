Write-Host "Lambda Deployer for ChatWithBedrockAgent"
$env:AWS_PROFILE = "cursor"

# Create a temporary directory for deployment
$tempDir = "deploy_temp"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy necessary files to temp directory
Copy-Item index.js, package.json -Destination $tempDir

# Install dependencies in temp directory
Set-Location $tempDir
npm install --production
Set-Location ..

# Remove old zip if it exists
if (Test-Path lambda-code.zip) { Remove-Item lambda-code.zip }

# Zip files from temp directory
Compress-Archive -Path "$tempDir\*" -DestinationPath lambda-code.zip -Force

$size = (Get-Item lambda-code.zip).Length
Write-Host "Zip size: $([math]::Round($size / 1MB, 2)) MB"

# Update function code
aws lambda update-function-code --function-name ChatWithBedrockAgent --zip-file fileb://lambda-code.zip --region us-east-2

# Enable X-Ray tracing
aws lambda update-function-configuration --function-name ChatWithBedrockAgent --tracing-config Mode=Active --region us-east-2

# Cleanup
Remove-Item -Recurse -Force $tempDir
Remove-Item lambda-code.zip

Write-Host "Deploy complete!"
Read-Host "Press Enter to exit" 