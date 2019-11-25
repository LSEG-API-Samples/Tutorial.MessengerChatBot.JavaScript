## Changes
1. create package.json for npm installation
2. Add semicolon (';') at the end of statement
3. Change all single quote (') to double quote (") for consistency 
4. Change console.log code from console.log("message" + data); to template string console.log(`message ${data}`);
5. Add README.md file
6. moved 'chatroomId' to be global and constant variable. Every code that access the chat room id are now accessing via chatroomId variable instead.
7. Move apiBasePath variable to be global constant
8. change username and password parameters to bot_username and bot_password for easy understand.
9. Dynamic get Chatroom id instead of let the clients hard code it.
10. Add error handles
11. Revise that username and password assign code.
12. Update README.md file
13. Change tutorial application source code name from simple_chatbot.js to src/tutorial_chatbot.js (and add new folder)
