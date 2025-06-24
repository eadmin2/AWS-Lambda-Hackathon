# Update va-facilities-proxy Lambda code only
param(
  [string]$LambdaArn = "arn:aws:lambda:us-east-2:281439767132:function:va-facilities-proxy"
)

Compress-Archive -Path ./index.js,./package.json,./node_modules -DestinationPath function.zip -Force

aws lambda update-function-code --function-name $LambdaArn --zip-file fileb://function.zip

Write-Host "Lambda code updated for $LambdaArn." 