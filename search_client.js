const request = require('request');

class SearchClient {
    constructor(searchConfig) {
        this.searchServiceName = searchConfig.searchServiceName;                
        this.apiKey = searchConfig.apiKey;
        this.indexName = searchConfig.indexName;
        this.indexerName = searchConfig.indexerName;
        this.apiVersion = searchConfig.apiVersion;
    }

    //api call to run indexer, returns status code 202 on success
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
                    resolve(response.statusCode);
                })
            }
        );
        return requestPromise;   
    }

    //api call to run search, returns response body
    exec_search(query) {

        var url = `https://${this.searchServiceName}.search.windows.net/indexes/${this.indexName}/docs?api-version=${this.apiVersion}&queryType=full&searchMode=all&$count=true&search=`;
    
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