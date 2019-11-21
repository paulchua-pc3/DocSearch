const dotenv = require('dotenv');
const { SearchClient } = require('./search_client');
const path = require('path');

var azureStorage = require('azure-storage');
var multiparty = require('multiparty');

const express = require('express');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

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

var settings = require('./settings.json');

var storageAccount = settings.storageAccount;
var accessKey = settings.accessKey;
var containerName = settings.container;

app.get('/upload', function(req, res) {
    res.send(
    '<form action="/upload" method="post" enctype="multipart/form-data">' +
    '<input type="file" name="snapshot" />' +
    '<input type="submit" value="Upload" />' +
    '</form>'
  );
});

app.post('/upload', function (req, res) {
  var container = containerName;    
  var blobService = azureStorage.createBlobService(storageAccount, accessKey);
  var form = new multiparty.Form();

  form.on('part', function (part) {
    if (part.filename) {
      var size = part.byteCount;
      var name = part.filename;

      blobService.createBlockBlobFromStream(container, name, part, size, function (error) {
        if (error) {
          res.send(' Blob create: error ');
        }
      });
    } else {
      form.handlePart(part);
    }
  });
  form.parse(req);
  res.send('OK');
});

const server = app.listen(process.env.PORT || 3000, function(){
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});