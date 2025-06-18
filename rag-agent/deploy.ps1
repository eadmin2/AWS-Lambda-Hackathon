Write-Host "Lambda Deployer for rag-agent"
$env:AWS_PROFILE = "cursor"

# Always run npm install to ensure node_modules is up to date
Write-Host "Running npm install..."
npm install

# Remove old zip if it exists
if (Test-Path rag-agent.zip) { Remove-Item rag-agent.zip }

# Always include node_modules in the zip
Compress-Archive -Path index.js,package.json,package-lock.json,node_modules,lib,utils -DestinationPath rag-agent.zip -Force

$size = (Get-Item rag-agent.zip).Length
Write-Host "Zip size: $([math]::Round($size / 1MB, 2)) MB"

aws lambda update-function-code --function-name rag-agent --zip-file fileb://rag-agent.zip --region us-east-2
Remove-Item rag-agent.zip
Write-Host "Deploy complete!"
Read-Host "Press Enter to exit"