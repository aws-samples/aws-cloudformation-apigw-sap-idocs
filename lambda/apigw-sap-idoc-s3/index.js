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
        var qp = event.queryStringParameters 
        if(!qp.bn || qp.bn==""){
            console.log("S3 bucket not provided in the request", qp) 
            callback(getResponse(400,"S3 bucket not provided in the request. Hence can't store the data to S3"),null) 
        }
        var rc = event.requestContext 
        if(!rc){
            console.log("Request Context is empty", rc) 
            callback(getResponse(400,"Request Context cannot be empty. Need the request ID for the file name"),null) 
        }
        
        if(!rc.requestId || rc.requestId==""){
            console.log("File name is obtained from event.requestContext.requestId is empty",rc) 
            callback(getResponse(400,"File name cannot be empty. File name is obtained from event.requestContext.requestId. Hence can't store the data to S3"),null) 
        }
        
        var s3key = rc.requestId;
        var result = event.body;
        console.log(result); //XML
        
        storeItem(qp, callback, s3key, result, "text/xml");
        
    }catch(e){
        console.log("Lambda Execution Error", e) 
        callback(getResponse(400,JSON.stringify(e)),null) 
    }
}

function storeItem(qp, callback, s3key, body, contentType){

    var params = {Bucket: qp.bn, Key: s3key, Body: body, ContentType: contentType}

    var options = {} 
    var s3 = new AWS.S3() 
    s3.upload(params, options, function(err, data) {
        if(err){
            console.log("Error in uploading data to S3", err) 
            callback(getResponse(400,JSON.stringify(err)),null) 
        }else{
            console.log("File successfully loaded", data)
            callback(null,getResponse(200,JSON.stringify(data))) 
        }
    }) 
}

function getResponse(responseCode, message){
    var response = {}
    response.statusCode = responseCode
    var responseBody = {}
    responseBody.message = message
    response.body = JSON.stringify(responseBody)
    return response
}
