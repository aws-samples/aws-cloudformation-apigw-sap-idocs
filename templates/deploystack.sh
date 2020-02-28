#! /bin/bash

#  * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  *
#  * Permission is hereby granted, free of charge, to any person obtaining a copy of this
#  * software and associated documentation files (the "Software"), to deal in the Software
#  * without restriction, including without limitation the rights to use, copy, modify,
#  * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
#  * permit persons to whom the Software is furnished to do so.
#  *
#  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
#  * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
#  * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
#  * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
#  * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
#  * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#  */

# -- CHANGE THESE VALUES AS APPLICABLE -- #
: ${StackName:=apigwsapidocadapter}
: ${Environment:=sapidoc}
: ${S3BucketForIDOC:=sapidocs} # will be created in this script; will append account id to the bucket name
: ${S3BucketForArtifacts:=idocadapterartifacts} # will be created in this scriptt
# For Cognito User information
: ${USERNAME:=sapidocs} # Cognito user name to be created
: ${TMPPASS:=Initpass1} # Temporary password when creating the user
: ${EMAILID:=saponaws@example.com} # email ID for the user

# -- ****************************************** -- #
# -- DONOT CHANGE ANYTHING BELOW THIS LINE -- #
# -- ****************************************** -- #
lb=`echo $'\n.'`
lb=${lb%.}
: ${PASSWORD:=} 

if [ -z "$PASSWORD" ]
then
    read -s -p "Enter Password for the Cognito User: $lb" PASSWORD
    read -s -p "Re-enter Password: $lb" PASSWORD1
    while [ "$PASSWORD" != "$PASSWORD1" ]; do 
        read -s -p "Password didn't match, enter again: $lb" PASSWORD1
    done
fi
# Create artifacts bucket
#aws s3api create-bucket --bucket $S3BucketForArtifacts
# to solve illegal constraint issu
aws s3 mb s3://$S3BucketForArtifacts
# Upload artifacts to the bucket
aws s3 cp . s3://$S3BucketForArtifacts --recursive

TEMPLATE=./APIGatewaySAPIDOCAdapter.yml

aws cloudformation deploy \
--template-file $TEMPLATE \
--stack-name $StackName \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
Environment=$Environment  \
S3BucketForIDOC=$S3BucketForIDOC  \
S3BucketForArtifacts=$S3BucketForArtifacts  

USERPOOLID=$(aws cloudformation describe-stacks \
    --stack-name $StackName \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)

CLIENTID=$(aws cloudformation describe-stacks \
    --stack-name $StackName \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text) 
    
aws cognito-idp admin-create-user \
    --user-pool-id $USERPOOLID \
    --username $USERNAME \
    --temporary-password $TMPPASS \
    --message-action SUPPRESS \
    --user-attributes Name=email,Value=$EMAILID

SESSION_ID=$(aws cognito-idp initiate-auth \
    --client-id $CLIENTID \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=$USERNAME,PASSWORD=$TMPPASS --query 'Session' --output text)

aws cognito-idp admin-respond-to-auth-challenge \
    --user-pool-id $USERPOOLID \
    --client-id $CLIENTID \
    --challenge-name NEW_PASSWORD_REQUIRED \
    --challenge-responses NEW_PASSWORD=$PASSWORD,USERNAME=$USERNAME \
    --session $SESSION_ID