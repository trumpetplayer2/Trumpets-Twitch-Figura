local twitch = require('lib/Tp2Network')
vanilla_model.PLAYER:setVisible(false)
vanilla_model.CAPE:setVisible(false)
vanilla_model.ARMOR:setVisible(false)

function twitch_message(msg)
    print(msg)
end

twitch:Register_Listener(twitch_message)