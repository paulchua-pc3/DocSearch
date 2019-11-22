const request = require('request');

class SearchClient {
    constructor(searchConfig) {
        this.searchServiceName = searchConfig.searchServiceName;                
        this.apiKey = searchConfig.apiKey;
        this.indexName = searchConfig.indexName;
        this.indexerName = searchConfig.indexerName;
        this.apiVersion = searchConfig.apiVersion;
    }

    //api call to run indexer, returns {result:"success"} on successful start
    run_indexer() {
        var url = `https://${this.searchServiceName}.search.windows.net/indexers/${this.indexerName}/run?api-version=${this.apiVersion}`;
        
        var options = { 
            "url" : url,            
            "headers" : {
                'api-key' : this.apiKey
            }
        };

        var requestPromise = new Promise(
            function (resolve) {
                request.post(options, function (error, response, body) {
                    if (error){
                        console.log('error:', error);
                    }
                    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    //console.log('body:', body);
                    var result = {"result":"error"};
                    var statusCode = response.statusCode;
                    if (statusCode == "202"){
                        result = {"result":"success"};
                    }else{
                        result = {"result":"error", "statusCode": statusCode};
                    }
                    resolve(JSON.stringify(result));
                })
            }
        );
        return requestPromise;   
    }

    //api call to get indexer status(reset, inProgress, success, error), returns indexer status json
    get_indexer_status() {
        var url = `https://${this.searchServiceName}.search.windows.net/indexers/${this.indexerName}/status?api-version=${this.apiVersion}`;
        
        var options = { 
            "url" : url,            
            "headers" : {
                'Content-Type' : 'application/json',
                'api-key' : this.apiKey
            }
        };

        var requestPromise = new Promise(
            function (resolve) {
                request.get(options, function (error, response, body) {
                    if (error){
                        console.log('error:', error);
                    }
                    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    //console.log('body:', body);                    
                    var indexerStatus = "error";
                    var jsonBody = JSON.parse(body);
                    if (jsonBody.lastResult && jsonBody.lastResult.status){                       
                        indexerStatus = jsonBody.lastResult.status;
                        //treat reset the same as inProgress
                        if (indexerStatus == "reset"){
                            indexerStatus = "inProgress";
                        }
                    }
                    var result = {"status":indexerStatus};
                    resolve(JSON.stringify(result));
                })
            }
        );
        return requestPromise;   
    }

    //api call to run search, returns response body
    exec_search(query) {

        var url = `https://${this.searchServiceName}.search.windows.net/indexes/${this.indexName}/docs?api-version=${this.apiVersion}&queryType=simple&searchMode=all&highlight=mergedText&$count=true&search=`;
    
        var query_encoded = encodeURIComponent(query);
        var options = { 
            "url" : url+query_encoded,
            "headers" : {
                'Content-Type' : 'application/json',
                'api-key' : this.apiKey
            }
        };
       
        var requestPromise = new Promise(
            function (resolve) {
                request.get(options, function (error, response, body) {
                    if (error){
                        console.log('error:', error);
                    }
                    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                    //console.log('body:', body);
                    resolve(body);
                })
            }
        );
        return requestPromise;        
    }

}

module.exports.SearchClient = SearchClient;