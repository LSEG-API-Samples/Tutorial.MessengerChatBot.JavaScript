//|-----------------------------------------------------------------------------
//|            This source code is provided under the Apache 2.0 license      --
//|  and is provided AS IS with no warranty or guarantee of fit for purpose.  --
//|                See the project's LICENSE.md for details.                  --
//|              Copyright Refinitiv 2020. All rights reserved.               --
//|-----------------------------------------------------------------------------

const request = require("request-promise");
var WebSocketClient = require("websocket").client;
const Timeout = ms => new Promise(res => setTimeout(res, ms));
// winston logging module
const winston = require("winston");

// Global Default Variables
var text = "";

//Assign variables for pre-production & production.
const GWURL = "https://api.refinitiv.com";
const apiBasePath = "/messenger/beta1";
const content_type = "application/json";
const RDPAuthenURL = "/auth/oauth2/v1/token";
//Please verify below URL is correct via the WS lookup
const WSURL = "wss://api.collab.refinitiv.com/services/nt/api/messenger/v1/stream";

//Input your Bot Username
const bot_username = "---YOUR BOT USERNAME---";
//Input Bot Password
const bot_password = "---YOUR BOT PASSWORD---";
//Input your Messenger account AppKey.
const APPKey = "---YOUR MESSENGER ACCOUNT APPKEY---";
// Input your Eikon Messenger account email
const recipient_email = "---YOUR MESSENGER ACCOUNT EMAIL---";

var chatroomId = "";
var stsToken = null;

//Create winston logger object
let logger = winston.createLogger({
    level: "info",
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console({
            handleExceptions: true
        })
    ],
    exitOnError: false
});

// Constuctor function
var MessengerAPI = function (url, appid, wsURL) {
    this.access_token = "";
    this.refresh_token = "";
    this.appid = appid;
    this.client_secret = "";
    this.client = request;
    this.wsClient = new WebSocketClient();
    this.authRefreshInterval = 1000 * 60;
    this.wsURL = wsURL;
};

//Send authentication request message to Refinitiv Data Platform (RDP) Authentication Gateway
MessengerAPI.prototype.Authenticate = async function (username, password) {

    let authen_request_msg = {};
    if (this.refresh_token === "") { //First RDP Authentication; use username, password and client_id
        authen_request_msg = {
            grant_type: "password",
            scope: "trapi.messenger",
            username: username,
            password: password,
            client_id: this.appid,
            takeExclusiveSignOnControl: "true"
        }
    } else {
        authen_request_msg = { //Later RDP Authentication; use refresh_token
            grant_type: "refresh_token",
            username: username,
            refresh_token: this.refresh_token
        }
    }

    // Print RDP authentication request message for debugging purpose
    logger.debug(`Send POST:  ${JSON.stringify(authen_request_msg)} to ${GWURL + RDPAuthenURL}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "POST",
        url: GWURL + RDPAuthenURL,
        headers: {
            "Accept": "application/json",
            "Authorization": "Basic"
        },
        form: authen_request_msg,
        auth: {
            username: this.appid,
            password: this.client_secret,
        },
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        let jRsp = JSON.parse(rsp.body);
        // Print RDP authentication response message for debugging purpose
        logger.debug(`Receive: Authen result = ${JSON.stringify(jRsp)}`);
        this.access_token = jRsp.access_token;
        this.refresh_token = jRsp.refresh_token;
        this.authRefreshInterval = (parseInt(jRsp.expires_in) - 30) * 1000; //Set up time to refreshed based on RDP expire_in value
        return this.access_token; // Return Access Token (STS_TOKEN)
    } else {
        console.error(`Authentication fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

// Send Message to a recipient Email via HTTP REST
MessengerAPI.prototype.SendOnetoOneMessage = async function (recipientEmail, message) {
    // Print HTTP request message for debugging purpose
    logger.debug(`Send POST: ${JSON.stringify({
        recipientEmail: recipientEmail,
        message: message
    })} to ${GWURL + apiBasePath + "/message"}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "POST",
        url: GWURL + apiBasePath + "/message",
        headers: {
            Authorization: "Bearer " + this.access_token,
            "Content-Type": content_type
        },
        body: {
            recipientEmail: recipientEmail,
            message: message
        },
        json: true,
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        // Print response message for debugging purpose
        logger.debug(`Receive : ${JSON.stringify(rsp.body)}`);
        console.log(`Messenger BOT API: post a 1 to 1 message to ${recipientEmail} success`);
    } else {
        console.error(`Send message to Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }

};

//Get List of Chatrooms Function via HTTP REST
MessengerAPI.prototype.GetChatrooms = async function () {

    // Print for debugging purpose
    logger.debug(`Send GET: ${GWURL + apiBasePath + "/chatrooms"}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "GET",
        url: GWURL + apiBasePath + "/chatrooms",
        headers: {
            Authorization: "Bearer " + this.access_token,
            "Content-Type": content_type
        },
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        // Print response message for debugging purpose
        logger.debug(`Receive: ${JSON.stringify(rsp.body)}`);
        return JSON.parse(rsp.body);
    } else {
        console.error(`Get Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }

};

//Posting Messages to a Chatroom via HTTP REST
MessengerAPI.prototype.PostToChatroom = async function (roomId, message) {

    // Print HTTP request message for debugging purpose
    logger.debug(`Send POST: ${JSON.stringify({message: message})} to ${GWURL + apiBasePath + "/chatrooms/" + roomId + "/post"}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "POST",
        url: GWURL + apiBasePath + "/chatrooms/" + roomId + "/post",
        headers: {
            Authorization: "Bearer " + this.access_token,
            "Content-Type": content_type
        },
        body: {
            message: message
        },
        json: true,
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        // Print response message for debugging purpose
        logger.debug(`Receive: ${JSON.stringify(rsp.body)}`);
        console.log("Post message to Chatroom success");
    } else {
        throw rsp.body;
    }
};

//Joining a Bot to a Chatroom via HTTP REST
MessengerAPI.prototype.JoinChatroom = async function (roomId) {

    // Print for debugging purpose
    logger.debug(`Send GET: ${GWURL + apiBasePath + "/chatrooms/" + roomId + "/join"}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "POST",
        url: GWURL + apiBasePath + "/chatrooms/" + roomId + "/join",
        headers: {
            Authorization: "Bearer " + this.access_token,
            "Content-Type": content_type
        },
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        logger.debug(`Receive : ${JSON.stringify(rsp.body)}`);
        // return JSON.parse(rsp.body);
    } else {
        console.error(`Join Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Leave a Chatroom
MessengerAPI.prototype.LeaveChatroom = async function (roomId) {

    // Print for debugging purpose
    logger.debug(`Send GET: ${GWURL + apiBasePath + "/chatrooms/" + roomId + "/leave"}`);

    // Send a HTTP request message
    const rsp = await this.client({
        method: "POST",
        url: GWURL + apiBasePath + "/chatrooms/" + roomId + "/leave",
        headers: {
            Authorization: "Bearer " + this.access_token,
            "Content-Type": content_type
        },
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        logger.debug(`Receive : ${JSON.stringify(rsp.body)}`);
        return JSON.parse(rsp.body);
    } else {
        console.error(`Leave Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Call the async function to start authentication, open the swebsocket, get room id"s and join a room.
var main = async function (api, username, password, recipient_email) {
    console.log("Getting RDP Authentication Token ");
    let rsp = await api.Authenticate(username, password);
    console.log("Successfully Authenticated ");

    // Send 1 to 1 message to reipient without a chat room
    let text_to_post = "USD BBL EU AM Assessment at 11:30 UKT\nName\tAsmt\t10-Apr-19\tFair Value\t10-Apr-19\tHst Cls\nBRT Sw APR19\t70.58\t05:07\t(up) 71.04\t10:58\t70.58\nBRTSw MAY19\t70.13\t05:07\t(dn) 70.59\t10:58\t70.14\nBRT Sw JUN19\t69.75\t05:07\t(up)70.2\t10:58\t69.76";
    // Send 1 to 1 message to reipient without a chat room
    console.log(`Send 1 to 1 message to ${recipient_email}`);
    await api.SendOnetoOneMessage(recipient_email, text_to_post);

    console.log("Get Rooms ");
    let roomsRsp = await api.GetChatrooms();
    console.log(roomsRsp);
    chatroomId = roomsRsp["chatrooms"][0]["chatroomId"];

    console.log("Join Rooms ");
    await api.JoinChatroom(chatroomId);

    // Send a default message to a Chatroom
    console.log(`sending message to ${chatroomId} Rooms `);
    text_to_post = "Hello from JavaScript/Node.js";
    await api.PostToChatroom(chatroomId, text_to_post);

    // Leave a Chatroom
    console.log("Leave Rooms ");
    await api.LeaveChatroom(chatroomId);
};

// Setting Log level, the supported value is "info" and "debug"
logger.level = "info";
var api = new MessengerAPI(GWURL, APPKey, WSURL);

//Running the tutorial 
main(api, bot_username, bot_password, recipient_email).catch(rsp => console.log(rsp));