# Trumpet's Twitch Figura Plugin
A simple application and Figura plugin to allow linking Twitch Chat to a figura model.

## Setup
### Bot Setup 
- Download the repository
- Download [NodeJS](https://nodejs.org/en/download)
- Run Install.bat to install the required dependencies
- Rename 'Example.env' to '.env'
- Edit '.env' in a text editor. Set Primary Broadcaster to the channel name you want the bot to watch
- Go to the [Twitch Developer Console](https://dev.twitch.tv/console), and sign into the account you plan for the bot to use.
- Go to the Dashboard, and click "Register Your Application"
- Name the Backend Bot Name (This will only be displayed when authorizing the application)
- Set the OAuth Redirect URLs to 'http://localhost:443'
- Set the Category to 'Game Integration'
- Set the Client Type to Public
- Click Create
- Back on the Dashboard, click 'Manage' on your bot
- Copy the Client ID field and paste it into the TWITCH_CLIENT_ID field in the .env file.
- Set the BOT_ACCOUNT_NAME field to the name of the twitch account that this bot was created with.
- Run 'launch.bat'

The bot should initialize some settings and boot up.

### Figura Setup
- Go into Figura -> Settings
- Scroll to the bottom
- Set "Allow Networking" to "On"
- Set Network Restriction to "Whitelist"
- Select Network Filter
- Add Filter "localhost"

## Functionality
As of right now, the only functionality is chat messages, in the format of "Chatter: Message".

## TODO
I plan to improve the message to later be in a Json format similar to the layout below:
```json
{
    "chatter" : "(Name)",
    "message" : "(Chatter Message)",
    "badges" : [Broadcaster/Mod/VIP, Sub Badge, General Badge]
}
```

Additionally, I intend to add support for custom channel point redemptions