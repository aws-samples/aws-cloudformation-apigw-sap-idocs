/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var AWS = require("aws-sdk") 

exports.handler = function(event, context, callback) {        
    try{
        var authData = {} 
        var auth = event.headers.authorization
        //Get Authorization information from the request headers
        if (!auth){
            auth = event.headers.Authorization
            if (!auth){
                console.log("The request didn't have an authorization header. Hence, cannot approve the request") 
                callback("Unauthorized") 
            }
        }
        //Auth is base64 encoded. So decode it here
        var creds = auth.split(' ')[1]
        var credastxt = (new Buffer(creds, 'base64')).toString().split(':')
        authData.username = credastxt[0] 
        authData.password = credastxt[1] 

        if(!authData.username || authData.username==""){
            console.log("The request didn't have an user name. Hence, cannot approve the request") 
            callback("Unauthorized") 
        }
        if(!authData.password || authData.password==""){
            console.log("The request didn't have a password. Hence, cannot approve the request") 
            callback("Unauthorized") 
        }
        // Get Query String parameters
        var qp = event.queryStringParameters 
        if(!qp.upid || qp.upId==""){
            console.log("No Cognito User Pool ID provided in the request. Hence, cannot approve the request") 
        }
        if(!qp.cid || qp.cid==""){
            console.log("No Cognito Client ID provided in the request. Hence, cannot approve the request") 
        }
        authData.userpoolid = qp.upid // Cognito User Pool ID
        authData.clientid = qp.cid // Uesr Pool Client ID
        authData.bucket = qp.bn // IDOC bucket

        // Make async call to get token
        token(authData).then(tokenData =>{
            if(tokenData.success){
                // Valid token received, so all good
                callback(null, allow('me', event.methodArn)) 
            }else{
                // Cognito auth faile, so may be Access key and secret key were provided
                credentials(authData).then(credData=>{
                  if(credData.success){
                    //Credentials were successful
                    callback(null, allow('me', event.methodArn)) 
                  }else{
                    callback("Unauthorized") 
                  }
                })
            }
        })
        
    }catch(ex){
        console.log("Exception in authorizing the call: ", ex) 
        callback("Unauthorized") 
    }
    
}

async function credentials(authData){
  return await getCredentials(authData)
}

function getCredentials(authData){
  return new Promise(resolve => {
    var response = {
      success: false,
      authResult: {}
    } 
    try{
      // Create credentials object
      var creds = new AWS.Credentials({
        accessKeyId: authData.username, 
        secretAccessKey: authData.password
      });
      // Try to access the S3 bucket for IDOC.
      var s3 = new AWS.S3({
        credentials: creds
      })
      var s3params = {
        Bucket: authData.bucket,
        MaxKeys: 1
      }
      //List objects in the S3 bucket. If the credentials are incorrect, then this will fail
      s3.listObjects(s3params,function(err,data){
        if(err){
          console.log("Error in accessing bucket", err);
          resolve(response) 
        }else{
          response.success = true
          resolve(response)
        }
      })
    }catch(e){
      console.log("Error in getting creds", e);
      resolve(response) 
    }
  })
}

async function token(authData) {
  return await getToken(authData) 
}

// We authenticate the user with Cognito User Pool
function getToken(authData) {
  return new Promise(resolve => {
    var response = {
        success: false,
        authResult: {}
    } 
    
    try {
      var params = {
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        UserPoolId: authData.userpoolid,
        ClientId: authData.clientid,
        AuthParameters: {
          USERNAME: authData.username,
          PASSWORD: authData.password
        }
      } 
      // Trying admin initiated auth
      var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider() 
      cognitoidentityserviceprovider.adminInitiateAuth(params, function(
        err,
        data
      ) {
        if (err) {
          console.log("Error in getting cognito token through admin auth: ", err) 
        } else {
          try {
            var tokenId = data.AuthenticationResult.IdToken 
            if(!tokenId || tokenId=="" ){
                response.success = false 
            }else{
                //console.log("Token ID is ", tokenId) 
                response.success = true 
                response.authResult = data.AuthenticationResult 
            }
          } catch (e) {
            response.success = false 
            console.log("Error in getting AuthenticationResult: ", e) 
          }
        }
        resolve(response) 
      }) 
    } catch (e) {
      resolve(response) 
    }
  }) 
}

function allow(principalId,resource){
  var authResponse = {} 
  authResponse.principalId = principalId 
  if (resource) {
    var policyDocument = {} 
    policyDocument.Version = '2012-10-17' 
    policyDocument.Statement = [] 
    var statementOne = {} 
    statementOne.Action = 'execute-api:Invoke'  
    statementOne.Effect = 'Allow' 
    statementOne.Resource = resource 
    policyDocument.Statement[0] = statementOne 
    authResponse.policyDocument = policyDocument 
  }
  return authResponse 
}
