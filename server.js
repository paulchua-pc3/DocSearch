const dotenv = require('dotenv');
const { SearchClient } = require('./search_client');
const path = require('path');

const upload = require('./routes/upload');

const express = require('express');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use('/upload', upload);

app.get("/", (req, res) => {
  res.render("index");
});

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

app.post('/indexer/run', async (req, res) => {
    try{
        const searchClient = new SearchClient(searchConfig);
        var resultJsonString = await searchClient.run_indexer();
        res.send(resultJsonString);        
    } catch (error) {
        // Passes errors from async searchClient call to error handler
        return next(error);
    }
});

app.get('/indexer/status', async (req, res) => {
    try{
        const searchClient = new SearchClient(searchConfig);
        var resultJsonString = await searchClient.get_indexer_status();
        res.send(resultJsonString);        
    } catch (error) {
        // Passes errors from async searchClient call to error handler
        return next(error)
    }
});

const server = app.listen(process.env.PORT || 3000, function(){
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});