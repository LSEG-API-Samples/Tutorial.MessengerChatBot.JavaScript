const request = require('request-promise');
var WebSocketClient = require('websocket').client;
const Timeout = ms => new Promise(res => setTimeout(res, ms))
var text = '';

var MessengerAPI = function (url, appid, wsURL) {
    this.EDPURL = url;
    this.apiBasePath = "/messenger/beta1";
    this.access_token = ""
    this.appid = appid
    this.client = request;
    this.wsClient = new WebSocketClient();
    this.authRefreshInterval = 1000 *60
    this.wsURL = wsURL
};

//Create Authentication Function
MessengerAPI.prototype.Authenticate = async function(username, password){
    var rsp =  await this.client({
        method: 'POST',
        url: this.EDPURL + '/auth/oauth2/beta1/token',
        form:
            {
                grant_type: 'password',
                scope: 'trapi.messenger',
                username: username,
                password: password,
                client_id: this.appid,
                takeExclusiveSignOnControl: 'true'
            }
    });
    jRsp = JSON.parse(rsp)
    this.access_token = jRsp.access_token
    this.username = username
    this.password = password
    return this.access_token;
};

//Create Send Message Function
MessengerAPI.prototype.SendMessage = async function(recipientEmail, message){
    var rsp = await this.client({
        method: 'POST',
        url: this.EDPURL+ this.apiBasePath+'/message',
        headers: { Authorization: 'Bearer ' + this.access_token, 'Content-Type': 'application/json' },
        body: { recipientEmail: recipientEmail, message: message },
        json: true
    });
    return JSON.parse(rsp);
};

//Create Get List of Chatrooms Function
MessengerAPI.prototype.GetChatrooms = async function(){
    var rsp = await this.client({
        method: 'GET',
        url: this.EDPURL+  this.apiBasePath+'/chatrooms',
        headers: { Authorization: 'Bearer ' + this.access_token, 'Content-Type': 'application/json' },
    });
    return JSON.parse(rsp);
};

//Create function for Posting Messages to a Chatroom
MessengerAPI.prototype.PostToChatroom = async function(roomId, message){
    await this.client({
        method: 'POST',
        url: this.EDPURL+ this.apiBasePath+'/chatrooms/'+ roomId +'/post',
        headers: { Authorization: 'Bearer ' + this.access_token, 'Content-Type': 'application/json' },
        body: { message: message },
        json: true
    });
};

//Create function for Joining a Bot to a Chatroom
MessengerAPI.prototype.JoinChatroom = async function(roomId){
    var rsp = await this.client({
        method: 'POST',
        url: this.EDPURL+ this.apiBasePath+'/chatrooms/'+ roomId +'/join',
        headers: { Authorization: 'Bearer ' + this.access_token, 'Content-Type': 'application/json' },
    });
    return JSON.parse(rsp);
};

//Create a function to Leave a Chatroom
MessengerAPI.prototype.LeaveChatroom = async function(roomId){
    var rsp = await this.client({
        method: 'POST',
        url: this.EDPURL + this.apiBasePath+'/chatrooms/'+ roomId +'/leave',
        headers: { Authorization: 'Bearer ' + this.access_token, 'Content-Type': 'application/json' },
    });
    return JSON.parse(rsp);
};

//Function for Refreshing Tokens.  Auth Tokens need to be refreshed within 5 minutes for the WebSocket to persist
MessengerAPI.prototype.keepAlive = async function(connection){
    while(true){
        await Timeout(authRefreshInterval)
        var stsToken = await this.Authenticate(username, password)
        var payload = {
            reqId: ""+(Math.random()*1000000),
            command: "authenticate",
            payload: { stsToken: stsToken }
        };
        connection.sendUTF(JSON.stringify(payload))
        console.log("Token Refreshed")
    }
}

//Starts the websocket function
//Change the groupchat name to an input variable from the get chatrooms api call.
MessengerAPI.prototype.StartWS = async function(){
    this.wsClient.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
    });
    stsToken = this.access_token
    authRefreshInterval = this.authRefreshInterval
    username = this.username
    password = this.password
    authenticate = this.Authenticate
    api = this
    this.wsClient.on('connect', async function(connection) {
        console.log('WebSocket Client Connected');
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', function() {
            console.log('Connection Closed');
            process.exit(1)
        });
        connection.on('message', async function(message) {
            if (message.type === 'utf8') {
                console.log("Received: " + message.utf8Data);
                foo = JSON.stringify(message.utf8Data);
                bar = message.utf8Data;
            }
            
            o = JSON.parse(message.utf8Data);            
            msg = JSON.parse(message.utf8Data);
            
            if (msg.event == 'chatroomPost') {
                text = msg.post.message;
                if (text == '/help'){
                    console.log('Got here');
                  await api.PostToChatroom('groupchat-8b00c8ebecf0f30d7105eedd1180926f', "What would you like help with?\n ") 
                }
                if (text == 'C1'){
                    console.log('C1');
                  await api.PostToChatroom('groupchat-8b00c8ebecf0f30d7105eedd1180926f', "What would you like help with?\n ")
                }
                if (text == 'C2'){
                    console.log('C2');
                  await api.PostToChatroom('groupchat-8b00c8ebecf0f30d7105eedd1180926f', "What would you like help with?\n ")
                }
                if (text == 'C3'){
                    console.log('C3');
                  await api.PostToChatroom('groupchat-8b00c8ebecf0f30d7105eedd1180926f', "What would you like help with?\n ")
                }
            }
        });
        var payload = {
            reqId: ""+(Math.random()*1000000),
            command: "connect",
            payload: { stsToken: stsToken }
        };
        var jPayload = JSON.stringify(payload)
        connection.sendUTF(jPayload);
        api.keepAlive(connection)

    });

    this.wsClient.connect(this.wsURL, 'messenger-json');
};


//Call the async function to start authentication, open the swebsocket, get room id's and join a room.
var main = async function (api,username, password, wsURL) {
    console.log("Get Token ");
    var rsp = await api.Authenticate(username, password)
    await api.StartWS(wsURL)
    console.log("Get Rooms ");
    var roomsRsp = await api.GetChatrooms();
    console.log(roomsRsp)
    console.log("Join Rooms ");

    //Change below to an input from the get chatrooms id
    var chatroomId = "groupchat-8b00c8ebecf0f30d7105eedd1180926f"
    var val = await api.JoinChatroom(chatroomId) ;
    
}

//Assign variables for pre-production & production.
var GWURL = "https://api.refinitiv.com"
var GWULRAUTH = "https://api.refinitiv.com/auth/oauth2/beta1/token"
var APPKey = "APPKEY"
var username = "BOTNAME";
var password = "PASSWORD";
//Please verify below URL is correct via the WS lookup
var WSURL = "wss://beta.api.collab.refinitiv.com/services/nt/api/messenger/v1/stream"
var api = new MessengerAPI(GWURL, APPKey,WSURL);
main(api, username, password).catch(rsp => console.log(rsp))
