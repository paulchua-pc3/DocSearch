module.exports = function(query) {
    const fs = require('fs');    
    var wordsCsv = fs.readFileSync('./words.csv','utf-8')
    var words = wordsCsv.split("\r\n").filter((x)=>x!="");
    if (!wordsCsv.match("\r")){
        words = wordsCsv.split("\n").filter((x)=>x!="");
    }
    var list = words.slice(0);    
    
    //using levenshtein distance
    const levenshtein = require('fast-levenshtein');
    list.sort((a, b) => levenshtein.get(query,a) - levenshtein.get(query,b));

    //using jaro-winkler similarity
    /*
    const similarity = require('jaro-winkler');
    list.sort((a, b) => similarity(query,b) - similarity(query,a));
    */
    return list.slice(0,3);
}