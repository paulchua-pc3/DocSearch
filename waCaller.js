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
      workspaceId: config.workspace_1_id
    };

    if ((query.length > 0) && (query.length <= 10) ){
        params.workspace_id = config.workspace_1_id;
    }else if ((query.length > 10) && (query.length <= 20)){
        params.workspace_id = config.workspace_2_id;
    }else if (query.length > 20){
        params.workspace_id = config.workspace_3_id;
    }else{
        console.error("query is empty string");
    }

    params.input = { "text": query };
    
    //console.log("params: ",JSON.stringify(params));
    assistant.message(params,
      function(err, response) {
        if (err) {
          console.error(err);
        } else {
          console.log(JSON.stringify(response.result, null, 2));
          callback(response.result.intents);
        }
      }
    );
  };