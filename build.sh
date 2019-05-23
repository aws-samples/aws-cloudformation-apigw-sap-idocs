#! /bin/bash
CurrDir=$(pwd)
#rm -rf build
#mkdir build

# Compile Lambda
cd $CurrDir/lambda/apigw-sap-idoc-authorizer
./build.sh

cd $CurrDir/lambda/apigw-sap-idoc-s3
./build.sh

cp $CurrDir/templates/APIGatewaySAPIDOCAdapter.yml $CurrDir/build/
cp $CurrDir/templates/deploystack.sh $CurrDir/build/

cp $CurrDir/lambda/apigw-sap-idoc-authorizer/apigw-sap-idoc-authorizer.zip  $CurrDir/build/
cp $CurrDir/lambda/apigw-sap-idoc-s3/apigw-sap-idoc-s3.zip  $CurrDir/build/

chmod +x $CurrDir/build/deploystack.sh