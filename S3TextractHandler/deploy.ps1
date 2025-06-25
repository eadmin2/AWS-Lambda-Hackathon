Write-Host "Lambda Deployer for S3TextractHandler"
$env:AWS_PROFILE = "cursor"

# Install dependencies
npm install

# Remove old zip if it exists
if (Test-Path lambda-code.zip) { Remove-Item lambda-code.zip }

# Zip files
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath lambda-code.zip -Force

$size = (Get-Item lambda-code.zip).Length
Write-Host "Zip size: $([math]::Round($size / 1MB, 2)) MB"

# Update function code
aws lambda update-function-code --function-name S3TextractHandler --zip-file fileb://lambda-code.zip --region us-east-2

# Enable X-Ray tracing
aws lambda update-function-configuration --function-name S3TextractHandler --tracing-config Mode=Active --region us-east-2

Remove-Item lambda-code.zip
Write-Host "Deploy complete!"
Read-Host "Press Enter to exit"