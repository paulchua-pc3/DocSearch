const dotenv = require('dotenv');
const { SearchClient } = require('./search_client');
const path = require('path');

const express = require('express');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//app.use(express.static('public'));

// Import required service configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

const searchConfig = {    
    searchServiceName: process.env.SearchServiceName,
    apiKey: process.env.ApiKey,
    indexName: process.env.IndexName,
    indexerName: process.env.IndexerName,
    apiVersion: process.env.ApiVersion    
};

app.get('/indexer', async (req, res) => { //replace with post after, get for testing purposes only
    try{
        const searchClient = new SearchClient(searchConfig);
        var statusCode = await searchClient.run_indexer();
        if (statusCode == "202"){
            res.send(JSON.stringify({"result":"success"}));
        }else{
            res.send(JSON.stringify({"result":"error", "statusCode": statusCode}));
        }
    } catch (error) {
        // Passes errors from async searchClient call to error handler
        return next(error)
    }
});

const server = app.listen(process.env.PORT || 3000, function(){
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});