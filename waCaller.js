module.exports = function(query, callback) {
    const settings = require('./settings.json');
    const config = settings.watson_classify;
  
    const AssistantV1 = require('ibm-watson/assistant/v1');

    const { IamAuthenticator } = require('ibm-watson/auth');
  
    const assistant = new AssistantV1({
      url: config.url,
      version: config.version,
      authenticator: new IamAuthenticator({ apikey: config.apikey })
    }); 
    //console.log("query "+query);
    //console.log("before query");
  
    var params = {
      workspaceId: config.workspace_id
    };   

    params.input = { "text": query };
    
    //console.log("params: ",JSON.stringify(params));
    assistant.message(params,
      function(err, response) {
        if (err) {
          console.error(err);
        } else {
          console.log(JSON.stringify(response.result, null, 2));
          if(response.result.intents.length > 0){
            callback(response.result.intents[0].intent);
          }else{
            callback("Irrelevant");
          }          
        }
      }
    );
  };