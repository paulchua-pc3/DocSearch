//params: query - word to match, type - Surgery_Type (use surgery list), or Injection_Med (use injection list)
module.exports = function(query,filename,type) {  
    const fs = require('fs');

    // Validate classification type
    if (type == "Irrelevant" || query == "手術材料" || query == "術材料" || query == "手術薬剤"){
        var list = [];
        return list;
    }

    // Extract data from csv files
    var db_filename = './surgeries.csv';
    if (type == "Injection_Med"){
        db_filename = './injections.csv'
    }
    var wordsCsv = fs.readFileSync(db_filename,'utf-8')
    var words = wordsCsv.split("\r\n").filter((x)=>x!="");
    if (!wordsCsv.match("\r")){
        words = wordsCsv.split("\n").filter((x)=>x!="");
    }

    // Insert extracted items in object list
    var list = words.map((x)=>{ 
        var itemArr = x.split(",");
        var item = {};
        if (type == "Injection_Med"){
            item = {
                "text": itemArr[0],
                "code": itemArr[1],
                "score": 0               
            };
        }else{
            item = {
                "text": itemArr[0],
                "code": itemArr[1],
                "kcode": itemArr[2],
                "score": 0
            };
        }
        return item;
    });
    
    // Using levenshtein distance
    // const levenshtein = require('fast-levenshtein');
    // list.sort((a, b) => levenshtein.get(query,a) - levenshtein.get(query,b));
   
    // Using jaro-winkler similarity    
    // If using Damerau Levenshtein or Levenshtein algorithm - uncomment lines below
    // Uncomment lines below to use Jaro Winkler algorithm
    // const similarity = require('jaro-winkler'); 
    // list.sort((a, b) => similarity(query,b) - similarity(query,a));

    // If using Jaro Winkler algorithm - comment lines starting here
    // Using natural framework
    var natural = require('natural');
    var newList = [];

    list.forEach(x => {
        // Perform string trimming
        var newQuery = query.trim();
        var newText = x.text.trim();
        if (newQuery.includes('　')){
            newQuery = newQuery.replace('　', '');
        }
        if (newText.includes('　')){
            newText = newText.replace('　', '');
        }

        // Get score by Damerau Levenshtein algorithm
        // Uncomment line below to use Damerau Levenshtein algorithm
        x.score = natural.DamerauLevenshteinDistance(newQuery,newText, {
        // Uncomment line below to use Levenshtein algorithm
        // x.score = natural.LevenshteinDistance(newQuery,newText, {
            insertion_cost: 1,
            deletion_cost: 1,
            substitution_cost: 1,
            transposition_cost: 0
        });

        // Validate score
        if (x.score <= 3){
            newList.push(x);
        }else{
            // Perform second process by searching if newQuery contains in newText value 
            // Uncomment line below to use Damerau Levenshtein algorithm
            var stringContains = natural.DamerauLevenshteinDistance(newQuery,newText,{search: true}, {
            // Uncomment line below to use Levenshtein algorithm
            // var stringContains = natural.LevenshteinDistance(newQuery,newText,{search: true}, {
                insertion_cost: 5,
                deletion_cost: 1,
                substitution_cost: 1,
                transposition_cost: 0
            });            
            if (stringContains.substring != "" && stringContains.score <= 7){
                x.score = stringContains.score;
                newList.push(x);
            }
        }
    });   

    // Sort list by score descending value
    newList.sort((a,b) => b.score - a.score);
    newList.reverse();
    // If using Jaro Winkler algorithm - comment lines end here

    // Return list capacity of 10
    // If using Jaro Winkler algorithm - uncomment line below
    // return list.slice(0,10);
    // If using Damerau Levenshtein or Levenshtein algorithm - uncomment line below
    return newList.slice(0,10);
}