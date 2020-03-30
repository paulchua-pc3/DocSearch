module.exports = function (query, filename, callback) {
  const settings = require('./settings.json');
  const path = require('path');
  const config = settings.watson_classify;

  const AssistantV1 = require('ibm-watson/assistant/v1');

  const { IamAuthenticator } = require('ibm-watson/auth');

  const assistant = new AssistantV1({
    url: config.url,
    version: config.version,
    authenticator: new IamAuthenticator({ apikey: config.apikey })
  });

  var params = {
    workspaceId: config.workspace_id
  };

  params.input = { "text": query };

  assistant.message(params,
    function (err, response) {
      if (err) {
        console.error(err);
      } else {        
        if (response.result.intents.length > 0) {
          if (response.result.intents[0].confidence >= 0.9) {
            callback(response.result.intents[0].intent);
          } else {
            callback("Irrelevant");
          }
        } else {
          callback("Irrelevant");
        }
      }
    }
  );
};