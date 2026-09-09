local twitch = require('lib/Tp2Network')
vanilla_model.PLAYER:setVisible(false)
vanilla_model.CAPE:setVisible(false)
vanilla_model.ARMOR:setVisible(false)

function twitch_message(msg)
    if(not animations.model.headspin:isPlaying()) then
        animations.model.headspin:setPlaying(true)
        animations.model.headspin:setLoop("ONCE")
    end
end

twitch:Register_Listener(twitch_message)