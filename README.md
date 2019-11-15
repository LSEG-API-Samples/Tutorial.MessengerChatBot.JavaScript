# Messenger Bot API Tutorial

[Eikon Messenger](https://www.refinitiv.com/en/products/eikon-trading-software/eikon-messenger-securemessaging) is a free to use, compliant and secure messagin open messaging platform.  The platform allows users ineterate into the Eikon Desktop and share messages, data, files, charts, screenshots, and emoticons with your contacts on via desktop, mobile and web access.

The [Messenger Bot API page](https://developers.refinitiv.com/messenger-api) provides a set of available API calls to build automated workflows or bots for Eikon Messenger. The Bot API allows your applications to connect with and pass information
into Eikon’s Messenger service programmatically.

## Prerequisite
This tutorial source code requires the following dependencies.
1. [Eikon Messenger](https://www.refinitiv.com/en/products/eikon-trading-software/eikon-messenger-securemessaging).
2. [Node.js](https://nodejs.org/en/) runtime.
3. [npm](https://www.npmjs.com/) package manager (included in Node.js)
4. Eikon Messenger Bot API access and license.

Please contact your Refinitiv's representative to help you to access Eikon Message and Bot API. The Refinitiv team will then provision and set up the bot. Once this is done the email user you provided will receive an automated email with how to set up a password for the bot.

## Running the Tutorial
1. Unzip or download the tutorial project folder into a directory of your choice 
2. Run ```$> npm install``` command in the command prompt to install all the dependencies required to run the sample in a subdirectory called *node_modules/*.
3. If the machine is behind a proxy server, you need to configure Node.js uses proxy instead of a direct HTTP connection via the following command in command prompt: 
    ```
    set https_proxy=http://<proxy.server>:<port>
    ```
4. Please follow the Messenger Bot API Tutorials page.

## Authors

- Dino Diviacchi


## <a id="references"></a>References
For further details, please check out the following resources:
* [Refinitiv Messenger Bot API page](https://developers.refinitiv.com/messenger-api) on the [Refinitiv Developer Community](https://developers.thomsonreuters.com/) web site.
* [Refinitiv Messenger Bot API: Quick Start](https://developers.refinitiv.com/messenger-api/messenger-bot-api/quick-start). 
* [Refinitiv Messenger Bot API: Documentation page](https://developers.refinitiv.com/messenger-api/messenger-bot-api/docs).
* [Node.js Documentation page](https://nodejs.org/dist/latest-v12.x/docs/api/).

