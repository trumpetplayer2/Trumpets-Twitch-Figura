Twitch = {}

local twitch_msg_event = {}
local _connection

function try_connect()
  if(not net:isNetworkingAllowed()) 
  then 
    return false
  end
  --return false
  connection = net.http:request("http://localhost:443/figura")
   -- Send Handshake Message
   connection:method("GET")
   _connection = connection:send()
   return true
end

function readConnection()
  if _connection:getValue() then
    local entry = _connection:getValue():getData():read()
    if(entry > -1) then
      entry = string.char(entry)
    if(entry == '0') then
      -- No message recieved.
    else if entry == '1' then
      local msg = ""
      entry = _connection:getValue():getData():read()
      while entry ~= -1 do
        if string.char(entry) ~= "\n" then
          msg = msg .. string.char(entry);
        else
          twitch_message(msg)
          msg = ""
        end
      entry = _connection:getValue():getData():read()
      end
    if msg ~= "" then
      twitch_message(msg)
      end;
    end
  end
  end
end
  _connection = connection:send();
end

function events.tick()
  if(_connection) and _connection:isDone() then
    readConnection()
  end
end

function twitch_message(msg)
  if(twitch_msg_event) then
    for k in twitch_msg_event do
      k(msg)
    end
  end
end

function Twitch:Register_Listener(type, func)
  if type == "message" then
    twitch_msg_event.insert(func)
    print(twitch_msg_event)
  end
end

function Twitch:Remove_Listener(func)
  twitch_msg_event.remove(func)
end

function Twitch:Clear_Listeners()
  twitch_msg_event = {}
end

try_connect()

return Twitch