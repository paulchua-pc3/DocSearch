//params: query - word to match, type - Surgery_Type (use surgery list), or Injection_Med (use injection list)
module.exports = function(query,type) {
    if (type == "Irrelevant"){
        var list = [];
        return list;
    }
    const fs = require('fs');
    var filename = './surgeries.csv';
    if (type == "Injection_Med"){
        filename = './injections.csv'
    }
    var wordsCsv = fs.readFileSync(filename,'utf-8')
    var words = wordsCsv.split("\r\n").filter((x)=>x!="");
    if (!wordsCsv.match("\r")){
        words = wordsCsv.split("\n").filter((x)=>x!="");
    }
    var list = words.map((x)=>{ 
        var itemArr = x.split(",");
        var item = {};
        if (type == "Injection_Med"){
            item = {
                "text": itemArr[0],
                "code": itemArr[1]                
            };
        }else{
            item = {
                "text": itemArr[0],
                "code": itemArr[1],
                "kcode": itemArr[2]
            };
        }
        return item;
    });
    
    //using levenshtein distance
    /*
    const levenshtein = require('fast-levenshtein');
    list.sort((a, b) => levenshtein.get(query,a) - levenshtein.get(query,b));
    */
   
    //using jaro-winkler similarity
    
    const similarity = require('jaro-winkler');
    list.sort((a, b) => similarity(query,b.text) - similarity(query,a.text));
    
    return list.slice(0,3);
}