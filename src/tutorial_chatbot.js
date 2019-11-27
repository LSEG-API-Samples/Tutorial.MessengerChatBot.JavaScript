const request = require("request-promise");
var WebSocketClient = require("websocket").client;
const Timeout = ms => new Promise(res => setTimeout(res, ms));
var text = "";

//Assign variables for pre-production & production.
const GWURL = "https://api.refinitiv.com";
const apiBasePath = "/messenger/beta1";
const content_type = "application/json";

//Input your Messenger account AppKey.
const APPKey = "XXXXXXXX";
//Input your Bot Username
const bot_username = "XXXXXXXX";
//Input Bot Password
const bot_password = "XXXXXXXX";
var chatroomId = "";

//Please verify below URL is correct via the WS lookup
const WSURL = "wss://api.collab.refinitiv.com/services/nt/api/messenger/v1/stream";
var stsToken = null;


var MessengerAPI = function (url, appid, wsURL) {
    this.access_token = "";
    this.refresh_token = "";
    this.appid = appid;
    this.client = request;
    this.wsClient = new WebSocketClient();
    this.authRefreshInterval = 1000 * 60;
    this.wsURL = wsURL;

    this.test = function (username, password) {
        console.log(username);
        console.log(password);
    }
};

//Send authentication request message to EDP Authentication Gateway
MessengerAPI.prototype.Authenticate = async function (username, password) {

    let rsp = await this.client({
        method: "POST",
        url: GWURL + "/auth/oauth2/v1/token",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic"
        },
        form: {
            grant_type: "password",
            scope: "trapi.messenger",
            username: username,
            password: password,
            client_id: this.appid,
            takeExclusiveSignOnControl: "true"
        },
        resolveWithFullResponse: true
    }).catch(function (error) {
        return error.response;
    });

    if (rsp.statusCode === 200) { //Status Code 200 "OK"
        let jRsp = JSON.parse(rsp.body);

        this.access_token = jRsp.access_token;
        this.refresh_token = jRsp.refresh_token;
        this.authRefreshInterval = (parseInt(jRsp.expires_in) - 30) * 1000; //Set up time to refreshed based on EDP expire_in value
        this.username = username;
        this.password = password;
        return this.access_token; // Return Access Token (STS_TOKEN)
    } else {
        console.error(`Authentication fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Create Send Message Function
MessengerAPI.prototype.SendMessage = async function (recipientEmail, message) {
    let rsp = await this.client({
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
        return JSON.parse(rsp.body);
    } else {
        console.error(`Send message to Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }

};

//Create Get List of Chatrooms Function
MessengerAPI.prototype.GetChatrooms = async function () {
    let rsp = await this.client({
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
        return JSON.parse(rsp.body);
    } else {
        console.error(`Get Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }

};

//Posting Messages to a Chatroom
MessengerAPI.prototype.PostToChatroom = async function (roomId, message) {

    let rsp = await this.client({
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
        console.log("Post message to Chatroom success");
    } else {
        throw rsp.body;
    }
};

//Joining a Bot to a Chatroom
MessengerAPI.prototype.JoinChatroom = async function (roomId) {
    let rsp = await this.client({
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
        return JSON.parse(rsp.body);
    } else {
        console.error(`Join Chatroom fail with HTTP status code: ${rsp.statusCode} ${rsp.body}`);
        throw rsp.body;
    }
};

//Leave a Chatroom
MessengerAPI.prototype.LeaveChatroom = async function (roomId) {
    let rsp = await this.client({
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
                    console.log(`receive text message: ${msg.post.message}`);
                    if (text === "/help") {
                        await api.PostToChatroom(chatroomId, "What would you like help with?\n ")
                    }
                    if (text === "C1") {
                        await api.PostToChatroom(chatroomId, "What would you like help with?\n ")
                    }
                    if (text === "C2") {
                        await api.PostToChatroom(chatroomId, "What would you like help with?\n ")
                    }
                    if (text === "C3") {
                        await api.PostToChatroom(chatroomId, "What would you like help with?\n ")
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
var main = async function (api, username, password, wsURL) {
    console.log("Get Token ");
    let rsp = await api.Authenticate(username, password);
    console.log("Successfully Authenticated ");
    console.log("Get Rooms ");
    let roomsRsp = await api.GetChatrooms();
    console.log(roomsRsp);
    chatroomId = roomsRsp["chatrooms"][0]["chatroomId"];

    console.log("Join Rooms ");
    let val = await api.JoinChatroom(chatroomId);

    await api.StartWS(wsURL);

};

var api = new MessengerAPI(GWURL, APPKey, WSURL);

//Running the tutorial 
main(api, bot_username, bot_password).catch(rsp => console.log(rsp));