# PowerShell script to deploy the VA Forms Lambda proxy

$FunctionName = "vaForms"
$Region = "us-east-2"

# 1. Install dependencies
Write-Host "Installing dependencies..."
npm install

# 2. Zip the Lambda function
Write-Host "Zipping Lambda function..."
if (Test-Path function.zip) { Remove-Item function.zip }
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath function.zip -Force

# 3. Update Lambda function code
Write-Host "Updating Lambda function code..."
aws lambda update-function-code --function-name $FunctionName --zip-file fileb://function.zip --region "$Region"

Write-Host "Deployment complete."
Write-Host "If you need to update API Gateway, do so via the AWS Console or extend this script." 