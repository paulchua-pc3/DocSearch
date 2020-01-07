const dotenv = require('dotenv');
const { SearchClient } = require('./search_client');
const path = require('path');

const upload = require('./routes/upload');

const closestWords = require('./closestWords');
const waCaller = require('./waCaller');
const fs = require('fs');

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

const testJson = require('./test.json');
const test2Json = require('./test2.json');
app.get('/testjson/:id', function (req, res){
  if (req.params.id == 2){
    res.send(JSON.stringify(test2Json));
  }else{
    res.send(JSON.stringify(testJson));
  }  
});

app.post('/search', async function (req,res){
  var query = req.body.query;
  var filter = req.body.filter;
  const searchClient = new SearchClient(searchConfig);
  console.log(query);
  var result = await searchClient.exec_search(query, filter);
  var resultJson = JSON.parse(result);
  var resultCount = resultJson["@odata.count"];
  var responseItems = [];
  resultJson.value.forEach( function (item){
    var fileUri = item.blob_uri;
    var filename = item.metadata_storage_name;
    var snippets = [];
    if (item["@search.highlights"]){
      snippets = item["@search.highlights"].mergedText;
    }else{
      
    }
    var layoutText = [];    
    if (item.layoutText && item.layoutText.length > 0){
        //layoutText = JSON.parse(item.layoutText[0]);
        layoutText = item.layoutText.map(x => JSON.parse(x));
    }
    
    var keyphrases = item.keyphrases;
    var locations = item.locations;
    var organizations = item.organizations;
    var people = item.people;
    var datetime = item.datetime;
    var symptoms = item.foundEntities;
    var normalizedImages = item.normalizedImages;
    var responseItem = {
      "fileUri": fileUri,
      "filename": filename,
      "snippets": snippets,
      "layoutText": layoutText,
      "keyphrases": keyphrases,
      "locations": locations,
      "organizations": organizations,
      "people": people,
      "datetime": datetime,
      "symptoms": symptoms,
      "normalizedImages": normalizedImages
    }
    responseItems.push(responseItem);
  });

  var response = JSON.stringify(responseItems); 

  res.send(response);
});

app.get('/closestwords', function (req,res){
  var query = req.query.query;
  waCaller(query, function(result){    
    var list = closestWords(query,result);
    res.send(JSON.stringify(list));
  });  
});

app.get('/classifyword', function (req,res){  
  var query = req.query.query;
  waCaller(query, function(result){    
    res.send(result);
  });  
});

app.post('/entitiesexport', function (req,res){
  var list = req.body.list;
  var docname = req.body.docname;
  var output_string = list.map( x => x.text+","+x.code+","+x.kcode).join("\r\n");
  var filename = './public/exports/'+docname+'.csv';
  fs.writeFileSync(filename, output_string);
  var href = '/exports/'+docname+'.csv'
  res.send(href);
});

//used to convert double-byte numbers and letters inside csv to single-byte
//(use only when server is in Windows environment, i.e. not when deployed in azure, because of CRLF(windows) vs LF(linux) issue)
app.get('/preprocesscsv', function (req,res){
  var filename = req.query.filename;
  var fileContents = fs.readFileSync('./'+filename,'utf-8');
  var newFileContents = fileContents.split("\r\n").map((line) => {
    var str = line;
    var regex = /[\uff01-\uff5e]+/g;
    if (str.match(regex)){
      var a = [...str.match(regex)];    
      a.forEach((x,i) => {
        var arr = x.split("");
        var newString = arr.map((x) => {
          var newChar = String.fromCharCode(x.charCodeAt(0)-65248);
          //replace with single-byte only if not ',' and '"' (to avoid breaking csv format)
          if ((newChar != ",") && (newChar != '"')){
            return newChar;
          }else{
            return x;
          }
        }).join("");
        str = str.replace(x,newString);
      })
    }    
    return str;
  }).join("\r\n");
  fs.writeFileSync('./new_'+filename,newFileContents);
  res.send("done");
})

const server = app.listen(process.env.PORT || 3000, function(){
    console.log(`Server started on port ${process.env.PORT || 3000}`);
});