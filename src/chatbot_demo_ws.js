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
// Input your Chatroom Name
const chatroom_name = "---YOUR CHAT ROOM NAME---";


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
        // The current RDP expires_time is 600 seconds (10 minutes). However, the Messenger Bot WebSocket server still uses 300 seconds (5 minutes).
        jRsp.expires_in = "300"
        this.authRefreshInterval = (parseInt(jRsp.expires_in) - 30) * 1000; //Set up time to refreshed based on RDP expire_in value
        return this.access_token; // Return Access Token (STS_TOKEN)
    } else {
        console.error(`Authentication fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Send Message to a recipient Email via HTTP REST
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
        logger.debug(`Receive: ${JSON.stringify(rsp.body)}`);
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
        // Print response message for debugging purpose
        logger.debug(`Receive: ${JSON.stringify(rsp.body)}`);
        return JSON.parse(rsp.body);
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
        // Print response message for debugging purpose
        logger.debug(`Receive: ${JSON.stringify(rsp.body)}`);
        return JSON.parse(rsp.body);
    } else {
        console.error(`Leave Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Function for Refreshing Tokens.  Auth Tokens need to be refreshed within 5 minutes for the WebSocket to persist
MessengerAPI.prototype.keepAlive = async function (connection) {
    while (true) {
        try {
            await Timeout(authRefreshInterval)
            stsToken = await this.Authenticate(bot_username, bot_password);
            const payload = {
                reqId: "" + (Math.random() * 1000000),
                command: "authenticate",
                payload: {
                    stsToken: stsToken
                }
            };
            connection.sendUTF(JSON.stringify(payload));
            console.log("Authenication Token Refreshed");
        } catch (error) {
            console.error(`Session keepAlive fail: ${error}`);
        }

    }
};

//Starts the WebSocket Connection
MessengerAPI.prototype.StartWS = async function () {

    this.wsClient.on("connectFailed", function (error) {
        console.log(`Connect Error: ${error.toString()}`);
    });

    stsToken = this.access_token;
    authRefreshInterval = this.authRefreshInterval;
    authenticate = this.Authenticate;
    api = this;

    this.wsClient.on("connect", async function (connection) {
        console.log("WebSocket Client Connected");
        connection.on("error", function (error) {
            console.log(`Connection Error: ${error.toString()}`);
        });
        connection.on("close", function () {
            console.log("Connection Closed");
            process.exit(1);
        });
        connection.on("message", async function (message) {
            if (message.type === "utf8") {
                console.log(`Received: ${message.utf8Data}`);
            }

            msg = JSON.parse(message.utf8Data);

            if (msg.event === "chatroomPost") { //Receive message from a Chatroom
                try {
                    text = msg.post.message;
                    console.log(`Receive text message: ${msg.post.message}`);
                    if (text === "/help" || text === "C1" || text === "C2" || text === "C3") {
                        await api.PostToChatroom(chatroomId, "What would you like help with?\n ");
                    } else if (text === "/complex_message") {
                        let complex_msg = "USD BBL EU AM Assessment at 11:30 UKT\nName\tAsmt\t10-Apr-19\tFair Value\t10-Apr-19\tHst Cls\nBRT Sw APR19\t70.58\t05:07\t(up) 71.04\t10:58\t70.58\nBRTSw MAY19\t70.13\t05:07\t(dn) 70.59\t10:58\t70.14\nBRT Sw JUN19\t69.75\t05:07\t(up)70.2\t10:58\t69.76";
                        await api.PostToChatroom(chatroomId, complex_msg);
                    }
                } catch (error) {
                    console.error(`Post message to Chatroom fail : ${error.toString()}`);
                }
            }
        });

        const payload = {
            reqId: (Math.random() * 1000000).toString(),
            command: "connect",
            payload: {
                stsToken: stsToken
            }
        };

        connection.sendUTF(JSON.stringify(payload)); //Send a connection request message to WebSocket server
        api.keepAlive(connection);

    });

    //Establish a WebSocket connection
    try {
        this.wsClient.connect(this.wsURL, "messenger-json");
    } catch (ws_error) {
        console.error(`WebSocket connection error: ${ws_error}`);
    }

};


//Call the async function to start authentication, open the swebsocket, get room id"s and join a room.
var main = async function (api, username, password, recipient_email) {
    console.log("Getting RDP Authentication Token ");
    let rsp = await api.Authenticate(username, password);
    console.log("Successfully Authenticated ");

    // Send 1 to 1 message to reipient without a chat room
    console.log(`Send 1 to 1 message to ${recipient_email}`);
    await api.SendOnetoOneMessage(recipient_email, "Hello from Node.js");

    console.log("Get Rooms ");
    let roomsRsp = await api.GetChatrooms();
    console.log(roomsRsp);
    //chatroomId = roomsRsp["chatrooms"][0]["chatroomId"];
    roomsRsp["chatrooms"].forEach((room) => {
        if (room["name"] === chatroom_name) {
            chatroomId = room.chatroomId;
        }
    });

    console.log("Join Rooms ");
    let val = await api.JoinChatroom(chatroomId);

    //await api.StartWS(wsURL);
    await api.StartWS();

};

// Setting Log level, the supported value is "info" and "debug"
logger.level = "info";
var api = new MessengerAPI(GWURL, APPKey, WSURL);

//Running the tutorial 
main(api, bot_username, bot_password, recipient_email).catch(rsp => console.log(rsp));