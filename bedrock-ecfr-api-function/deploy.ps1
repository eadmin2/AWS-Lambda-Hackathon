Write-Host "Lambda Deployer for bedrock-ecfr-api-function"
$env:AWS_PROFILE = "cursor"

# Remove old zip if it exists
if (Test-Path bedrock-ecfr-api-function.zip) { Remove-Item bedrock-ecfr-api-function.zip }

# Zip files
Compress-Archive -Path index.js,package.json -DestinationPath bedrock-ecfr-api-function.zip -Force

$size = (Get-Item bedrock-ecfr-api-function.zip).Length
Write-Host "Zip size: $([math]::Round($size / 1MB, 2)) MB"

aws lambda update-function-code --function-name bedrock-ecfr-api-function --zip-file fileb://bedrock-ecfr-api-function.zip --region us-east-2
Remove-Item bedrock-ecfr-api-function.zip
Write-Host "Deploy complete!"
Read-Host "Press Enter to exit" 