import * as dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import https from 'http';
import open from 'open';
import fs from 'node:fs';
import os from 'node:os';
import {WebSocketServer, WebSocket} from 'ws';
dotenv.config();

var app = express();
var server
try{
    var privateKey  = fs.readFileSync('sslcert/key.pem', 'utf8');
    var certificate = fs.readFileSync('sslcert/cert.pem', 'utf8');
 
    var credentials = {key: privateKey, cert: certificate};
    server = https.createServer(credentials, app)
}catch{
    console.log("No credentials found, starting in standard http mode")
    server = http.createServer(app);
}
let FiguraMessage = '';
let FiguraWaiting = false;
let Figura_Connected = false;
let generatedOAuth = false;
let websocketSessionID;

app.get('/', function(req, res){
    res.sendFile('public/index.html', { root: process.cwd()});
})
app.get('/figura', (req,res) => Figura_Hanlder(req, res))
server.listen(443);


async function Figura_Hanlder(req, res){
    if(!Figura_Connected){
        console.log("Figura Connected!")
        Figura_Connected = true;
    }
    FiguraWaiting = true;
    //Timeout Waiting
    let temp = await Promise.any([waitSeconds(60), new Promise(resolve => {
        async function checkForMessage(){
            if(FiguraMessage != '') {resolve(1); return;}
            setTimeout(() => checkForMessage(), 100);
            return;
        }
        checkForMessage()
    }
    )])
    FiguraWaiting = false;
    if(temp){
        res.send(`1${FiguraMessage}`)
        FiguraMessage = '';
    }else{
        res.send('0')
    }
    await waitSeconds(5)
}


async function figuraIntegration(broadcaster,chatter,message){
    if(!FiguraWaiting) return;
    FiguraMessage = `${chatter}: ${message}`
}

const twitch = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
const scopes = ['channel:read:redemptions', 'user:bot', 'user:read:chat', 'channel:bot'];

export async function generateOAuth(){
    generatedOAuth = true;
    const redirectURI = "http://localhost:443";
    var scope = '';
    for(let i = 0; i < scopes.length; i++){
        scope += scopes[i];
        if(i < scopes.length -1){
            scope += '+';
        }
    }let wss = new WebSocketServer({server:server});
    wss.on("connection", function connection(ws){
    ws.on("message", function message(data){
        var jsonObj = JSON.parse(data);
        if(jsonObj.Access_Token){
            process.env.TWITCH_OAUTH_TOKEN = jsonObj.Access_Token;
            updateEnv('TWITCH_OAUTH_TOKEN', jsonObj.Access_Token);
            console.log('Recieved Twitch Token!')
        }
        wss.close()
    })
    })
    const authorizationURL = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${redirectURI}&response_type=token&scope=${scope}`
    await open(authorizationURL, {popup: true});
}

twitch.addEventListener('message', async (event)=>{
    const JsonObject = JSON.parse(event.data);
    const data = JsonObject.metadata;
    if(event.data.includes('PING')) twitch.send('PONG');
    switch(data.message_type){
        case "session_welcome":
            websocketSessionID = JsonObject.payload.session.id
            //We wait for first subscription to finish to make sure access token exists
            await subscribeToEvent('channel.chat.message','1', {"broadcaster_user_id": process.env.BROADCASTER_ID, 'user_id': process.env.BOT_ID})
            return;
        case "session_keepalive":
            return;
        case "notification":
            NotificationMessage(JsonObject);
            return;
        case "revocation":
            console.log(`Subscription Revoked`);
            console.log(JsonObject.message);
            if(JsonObject.message.includes('OAUTH')){
                generateOAuth();
            }
            return;
        default:
            console.log(JsonObject.message_type)
    }
});

async function NotificationMessage(JsonMessage){
    //console.log(JsonMessage);
    const subscription = JsonMessage.payload.subscription;
    const event = JsonMessage.payload.event;
    switch(subscription.type){
        case 'channel.chat.message':
            figuraIntegration(event.broadcaster_user_name, event.chatter_user_name, event.message.text)
        break;
    }
}

async function subscribeToEvent(eventType, version, condition, repeat = false){
    const accessToken = process.env.TWITCH_OAUTH_TOKEN;
    //Data - This will be the -d in the curl
    const data = {
        //Json data
        'type': eventType,
        'version': version,
        'condition': condition,
        'transport':{
            'method': 'websocket',
            'session_id': websocketSessionID
        }
    };
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID,
            'Content-Type':'application/json'
        },
        body: JSON.stringify(data)
    });

    const responseData = await response.json();
    if(responseData.error && !generatedOAuth){
        if(responseData.error == 'Unauthorized'){
            await generateOAuth();
            subscribeToEvent(eventType, version, condition);
        }else{
            console.log(responseData.error)
        }
    }
}

function updateEnv(key, value){
    if(!fs.existsSync("./.env")){
        fs.writeFileSync("./.env", "")
    }
    const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);
    const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
        return line.match(new RegExp(key));
    }));
    if(target == -1){
        ENV_VARS.push(`${key}=${value}`)
    }else{
        ENV_VARS.splice(target, 1, `${key}=${value}`);
    }
    // replace the key/value with the new value
    
    // write everything back to the file system
    fs.writeFileSync(process.cwd() + "/.env", ENV_VARS.join(os.EOL));
}

async function fetchUserID(name){
    const accessToken = process.env.TWITCH_OAUTH_TOKEN;
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${name}`, {
        method: 'GET',
        headers:{
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID,
        }
    })
    const responseData = await response.json();
    if(!responseData.data) return;
    if(responseData.data[0]){
        return responseData.data[0].id;
    }else{
        return null;
    }
}

if(!process.env.BOT_ID && process.env.BOT_ACCOUNT_NAME && process.env.BOT_ACCOUNT_NAME != "(BOT ACCOUNT NAME)"){
    updateEnv("BOT_ID", await fetchUserID(process.env.BOT_ACCOUNT_NAME))
}

if(!process.env.BROADCASTER_ID && process.env.PRIMARY_BROADCASTER && process.env.PRIMARY_BROADCASTER != "(BROADCASTER ACCOUNT NAME)"){
    updateEnv("BROADCASTER_ID", await fetchUserID(process.env.PRIMARY_BROADCASTER))
}
let exit = false
if(!process.env.BOT_ACCOUNT_NAME){
    process.env.BOT_ACCOUNT_NAME = "(BOT ACCOUNT NAME)"
    updateEnv("BOT_ACCOUNT_NAME", "(BOT ACCOUNT NAME)")
    exit = true
}
if(!process.env.PRIMARY_BROADCASTER){
    process.env.PRIMARY_BROADCASTER = "(BROADCASTER ACCOUNT NAME)"
    updateEnv("PRIMARY_BROADCASTER", "(BROADCASTER ACCOUNT NAME)")
    exit = true
}
if(!process.env.TWITCH_CLIENT_ID){
    process.env.TWITCH_CLIENT_ID = "(Fill this out!)"
    updateEnv("TWITCH_CLIENT_ID", "(Fill this out!)")
}

if(process.env.PRIMARY_BROADCASTER == "(BROADCASTER ACCOUNT NAME)" || process.env.BOT_ACCOUNT_NAME == "(BOT ACCOUNT NAME)" || process.env.TWITCH_CLIENT_ID == "(Fill this out!)"
    || process.env.BROADCASTER_ID == 'undefined' || process.env.BOT_ID == 'undefined'
){
    process.exit(1, "Please fill out .env file")
}

export function waitSeconds(x) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, x * 1000); // Convert seconds to milliseconds
    });
}