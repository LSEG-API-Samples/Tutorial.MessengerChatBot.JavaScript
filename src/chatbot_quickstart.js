//|-----------------------------------------------------------------------------
//|            This source code is provided under the Apache 2.0 license      --
//|  and is provided AS IS with no warranty or guarantee of fit for purpose.  --
//|                See the project"s LICENSE.md for details.                  --
//|              Copyright Refinitiv 2020. All rights reserved.               --
//|-----------------------------------------------------------------------------

const request = require("request-promise");
let message = "Hello World!";

//Assign variables for pre-production & production.
const GWURL = "https://api.refinitiv.com";
const apiBasePath = "/messenger/beta1";
const RDPAuthenURL = "/auth/oauth2/v1/token";

const bot_username = "---YOUR BOT USERNAME---";
const bot_password = "---YOUR BOT PASSWORD---";
const APPKey = "---YOUR MESSENGER ACCOUNT APPKEY---";
const recipient_email = "---YOUR MESSENGER ACCOUNT EMAIL---";



// Send Message to a recipient Email via HTTP REST
function createPostMessage(message, access_token) {
    return {
        method: "POST",
        url: GWURL + apiBasePath + "/message",
        headers: {
            Authorization: "Bearer " + access_token,
            "Content-Type": "application/json"
        },
        body: {
            recipientEmail: recipient_email,
            message: message
        },
        json: true,
        resolveWithFullResponse: true
    };
}

// Send authentication request message to Refinitiv Data Platform (RDP) Authentication Gateway
var authRequest = {
    method: "POST",
    url: GWURL + RDPAuthenURL,
    form: {
        grant_type: "password",
        scope: "trapi.messenger",
        username: bot_username,
        password: bot_password,
        client_id: APPKey,
        takeExclusiveSignOnControl: "true"
    },
    resolveWithFullResponse: true
};



// Main function
async function send(message) {
    let response
    try {
        // Authentication
        console.log("Getting RDP Authentication Token ");
        response = await request(authRequest).catch(function(error) {
            return error.response;
        });

        
        if (response.statusCode === 200) { //Status Code 200 "OK"
            console.log("Successfully Authenticated ");
        } else { // HTTP request message fail
            console.error(`Authentication fail with HTTP status code: ${response.statusCode} ${response.body}`);
            throw response.body;
        }
        auth = JSON.parse(response.body);
        //console.log("auth",auth);
        // Sending 1 to 1 message
        response = await request(createPostMessage(message, auth.access_token)).catch(function (error) {
            return error.response;
        });

        if (response.statusCode === 200) { //Status Code 200 "OK"
            console.log(`Send 1 to 1 message "${message}" to ${recipient_email} success`);
        }  else { // HTTP request message fail
            console.error(`Send 1 to 1 message fail with HTTP status code: ${response.statusCode} ${response.body}`);
            throw response.body;
        }
      
    } catch (error) {
        console.error(error);
    }
}

send(message).catch(err => console.log);