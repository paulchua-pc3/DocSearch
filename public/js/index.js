
var query = "";
var resultsJson = {};
const wiki_url = "https://ja.wikipedia.org/wiki/";

//used to store the json data for the document being viewed in the modal
var doc_result_item = null;

//container for sur_lines; 1 page : 1 sur_lines; used first in display_file
var sur_lines_pages = [];

//container for sorted_sur_text; 1 page : 1 sorted_sur_text; used first in display_file
var s_pages = [];

//sorted 手術 text; used first in display_file
var sorted_sur_text = [];

//date text of 受診期間; used first in extract_entities_dpc
var date_text = "";

//text of 診療科; used first in extract_entities_dpc
var med_spec_text = "";

//debug code, for showing all lines of text
var lines_pages = [];

var SearchModeEnum = {
    "Standard": "standard",
    "Surgeries": "surgeries",
    "DPC": "dpc"
}

//standard, surgeries, dpc
var search_mode = SearchModeEnum.Standard;

/**pdf viewer start */
var pdfDoc = null,
        pageNum = 1,
        numPages = 0;
/**pdf viewer end */

$( document ).ready( function() {

    $("#updateIndex").click(function(){
        event.preventDefault();//prevent submit action
        run_indexer();
    });
    
    $("#upload-form").submit(function(event){
        event.preventDefault();
        var formData = new FormData(this);
        console.log(formData)
        $.ajax({
            type: "post",
            url: "/upload",
            data: formData,
            processData: false,
            contentType: false,
            success: function(result){
                console.log("result", result);
                alert("File uploaded successfully.");
                $("#file_name").val('');
                //$("#upload-message").html(result);
            },
            error: function (error) {
                console.log("error on upload:", error);
                alert("Error uploading file.");
            }
        });
    });

    $("#search_btn").click(execute_search);// main/general-purpose search button
    $("#sur_search").click(execute_search);// search button for surgeries
    $("#dpc_search").click(execute_search);// search button for DPC/入院

    // allows the user to execute search using "enter" key
    $("input[name='search']").keypress(function(event){
        if(event.keyCode==13){
            event.preventDefault();
            execute_search(event);
        }
    });

    $('#clear_filters').click(function() {
        $('#filter_org').val("");
        $('#filter_people').val("");
        $('#filter_loc').val("");
        $('#filter_year').val("");
    });

    $('#files_modal').on('show.bs.modal', function (event) {
        var link = $(event.relatedTarget);
        var modal = $(this);
        display_file(modal, link);
    })

    /**pdf viewer start */
    $('#prev').click(onPrevPage);
    $('#next').click(onNextPage);
    /**pdf viewer end */

    /**edit mode start*/
    $('#edit-btn').click(editModeButtonOnClick);
    $('#cancel-btn').click(function(){
        resetEditModeDisplay();
        //undo changes logic here
    });
    $('#export-btn').click(exportButtonOnClick);
    /**edit mode end*/

    $('#display_buttons input').change(toggleOCRDisplay);
});

function execute_search(event){
    event.preventDefault();
    $(".results").html("");//clear result area

    //set query based on button clicked
    var currentTarget = event.currentTarget.id
    if (currentTarget && currentTarget == "sur_search" || currentTarget == "dpc_search" ){
        
        if (currentTarget == "sur_search"){
            search_mode = SearchModeEnum.Surgeries;
            //use predefined query for surgeries
            query = "手術";
        }else if (currentTarget == "dpc_search"){
            search_mode = SearchModeEnum.DPC;
            //use predefined query for DPC/入院
            query = "DPC 包括";
        }        

    }else{
        search_mode = SearchModeEnum.Standard;
        //use user's input as query
        query = $("input[name='search']").val();
    }    
    org = $('#filter_org').val();
    people = $('#filter_people').val();
    loc = $('#filter_loc').val();
    year = $('#filter_year').val();

    filter = "";
    has_filter = false;
    if (org){
        filter += "organizations/any(o: o eq "+"\'"+org.replace(/^\s+|\s+$/g,'')+"\')";
        has_filter = true;
    }
    if (people){
        if (org){
            filter += " and ";
        }
        filter += "people/any(p: p eq "+"\'"+people.replace(/^\s+|\s+$/g,'')+"\')";
        has_filter = true;
    }
    if (loc) {
        if (org || people){
            filter += " and ";
        }
        filter += "locations/any(l: l eq "+"\'"+loc.replace(/^\s+|\s+$/g,'')+"\')";
        has_filter = true;
    }
    if (year){
        if (org || people || loc){
            filter += " and ";
        }
        filter += "datetime/any(d: d eq "+"\'"+year.replace(/^\s+|\s+$/g,'')+"\')";
        has_filter = true;
    }
    if (!has_filter){
        filter = "";
    } else {
        encoded_filter = encodeURIComponent(filter);
        filter = "&" + encodeURIComponent("$filter") + "=" + encoded_filter;
    }
    
    $.ajax({
        url: "/search",
        method: "post",
        data: JSON.stringify({"query":query,"filter":filter}),
        contentType: "application/json; charset=utf-8",
        success: function(results){
            resultsJson = JSON.parse(results);
            display_results(resultsJson);
        },
        error: function (error) {
            console.log("error on search:", error);                
        }
    });
}

function run_indexer(){
    $.ajax({
        url: window.location.origin + "/indexer/run",
        method: "post",
        contentType: "application/json; charset=utf-8",
        success: function(result) {
            var responseJson = JSON.parse(result);
            if (responseJson.result && responseJson.result == "success"){                
                wait_indexer_finished();
            }else {
                //error
                alert("Error in Starting Indexer.");
            }
        },
        error: function(){
            alert("Error in Starting Indexer.");
        }
    });
}

function wait_indexer_finished(){
    get_indexer_status( function(result) {
            if (result == "inProgress"){
                $("#indexerStatus").html("Indexer Execution in Progress...");
                setTimeout(wait_indexer_finished, 5000);
            }else if(result == "success"){
                $("#indexerStatus").html("");
                alert("Indexer Execution Complete.");
                //$("#indexerStatus").html("Indexer Execution Complete.");
            }else{
                $("#indexerStatus").html("");
                alert("Error in Indexer Execution.");
                //$("#indexerStatus").html("Error in Indexer Execution.");
            }    
    });
}

function get_indexer_status(callback){
    $.ajax({
        url: window.location.origin + "/indexer/status",
        method: "get",
        contentType: "application/json; charset=utf-8",
        success: function(result) {
            var responseJson = JSON.parse(result);
            if (responseJson.status){
                callback(responseJson.status);
            }else{
                //error unable to get status
                callback("error");
            }
        },
        error: function(){
            callback("error");
        }
    });
}

//To confirm
function display_resultsLabel(results){
    var countString = "";
    if (results.length > 0) {
        countString = ` (${results.length})`
        $("#results_label").html("Results"+countString);
    }else{
        $("#results_label").html("No Result Found");
    }
}

function display_results(results){
    display_resultsLabel(results);
    for (var i = 0; i < results.length; i++){
        var result = results[i];
        var new_row = $(".row.template").clone().attr("class", "row");
        var new_col = $(".col.template").clone().attr("class", "col");
        var new_result = $(".res.template").clone().attr("class", "res");
        var new_filename = $(".filename_link.template").clone().attr("class", "filename_link");
        new_filename.attr("id", "file"+i.toString());
        var result_filename = result.filename;
        new_filename.html(result_filename);
        $(new_result).append(new_filename);

        for (var j = 0; j < result.snippets.length; j++) {
            var new_filesnippet = $("div.snippet.template").clone().css("display", "block").attr("class", "snippet");
            var result_snippet = result.snippets[j];
            new_filesnippet.find("p").html(result_snippet);
            $(new_result).append(new_filesnippet);
            var html = $(new_result).html();
            $(new_result).html(html+"<hr>");
        }

        $(new_col).append(new_result);
        $(new_row).append(new_col);
        $(".results").append(new_row);
    }
}

function display_file(modal, link){       
    resetEditModeDisplay();
    var filename = link.html();
    modal.find('.modal-title').text(filename);    
    var fileId = link.attr("id");
    var resultIndex = parseInt(fileId.split("file")[1]);    
    var resultItem = resultsJson[resultIndex];
    doc_result_item = resultItem;
    pageNum = 1;
    numPages = resultItem.normalizedImages.length;
    $('#page_count').text(numPages);
    $('#pdf_viewer').css("display","none");
    $('#image_viewer').css("display","block");
    if (search_mode == SearchModeEnum.Surgeries){
        extract_entities_surgeries(resultItem);
    }else if (search_mode == SearchModeEnum.DPC){
        extract_entities_dpc(resultItem);
    }
    display_ocr_image(resultItem);
    $('#page_num').text(pageNum);   
    display_entities();    
    /*if (s_pages.length > 0){
        surText = s_pages.join(" <br/>---<br/> ");
    }*/

    var keyphrasesText = resultItem.keyphrases.slice(0,10).join(",")+",...";
    var organizationsText = getWikipediaLinksHtml(resultItem.organizations);
    var locationsText = getWikipediaLinksHtml(resultItem.locations);
    var peopleText = resultItem.people.join(",");
    var datetimeText = resultItem.datetime.join(",");
    var symptomsText = resultItem.symptoms.filter(x => x!="\n").join(",");
   
    /* disable for now, while focus is on surgeries extraction use case
    entitiesDiv.html(`Keyphrases:<br/>${keyphrasesText}<br/><br/>`
                     +`Organizations:<br/>${organizationsText}<br/><br/>`
                     +`Locations:<br/>${locationsText}<br/><br/>`
                     +`People:<br/>${peopleText}<br/><br/>`
                     +`Datetime:<br/>${datetimeText}<br/><br/>`
                     +`Symptoms:<br/>${symptomsText}<br/><br/>`
                     +`手術:<br/>${surText}`);
                     */
    //edit buttons
    /*$('.sur_drop').on('show.bs.dropdown', function(event){
        var div = event.currentTarget;
        var divId = div.id;
        var query = $(`#${divId} span.orig_text`).text();
        getClosestWords(query, function (result){            
            var dropdown_menu_div = $(`#${divId} div.dropdown-menu`);
            dropdown_menu_div.html(result.map((x)=>`<a class="dropdown-item" href="#">${x.text}</a>`).join(""));
            $('a.dropdown-item').click(editDropdownItemOnClick);
        });
    });*/
}

function display_entities(){
    var surText = "";
    if (s_pages[pageNum-1]){
        surText = s_pages[pageNum-1]
    }
    //debug code start, for showing all text 
    //uncomment this section to show all text
    //var sorted_lines = lines_pages[pageNum-1].sort((a,b) => { 
    //    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
    //});
    //sorted_text = sorted_lines.map(x => x.text);
    //surText = sorted_text;
    //debug code end

    if (search_mode == SearchModeEnum.DPC){
        $( "#entities_label" ).text("DPC");
        surText = date_text + '<br/>' + med_spec_text + '<br/>' + surText;

    }else{
        $( "#entities_label" ).text("手術");
    }
    var entitiesDiv = $( "#file_entities" );
    entitiesDiv.html(surText);
}

function display_ocr_image(resultItem) {
    //clear all ocr highlight boxes first
    $(".box.act").remove();
    var docImg = $( "#docImg" );
    docImg.css("width", "");
    docImg.css("height", "");  
    var uri = resultItem.fileUri;
    if (uri.match(/\.pdf$/i) != null){
        var imageData = JSON.parse(resultItem.normalizedImages[pageNum-1]);
        uri = "data:image/png;base64,"+imageData.data;
    }
    docImg.attr("src",uri);
    docImg.on("load", function(){
        var width = docImg.prop("naturalWidth");
        var height = docImg.prop("naturalHeight");      
        if (width > 2000 && height > 2000){
            if (width > height){
                docImg.css("width","2000px");
            }else{
                docImg.css("height","2000px");
            }
        }
        else if (width > 2000){
            docImg.css("width","2000px");
        }else if (height > 2000){
            docImg.css("height","2000px");
        }
        
        var words = [];
        if (resultItem.layoutText && resultItem.layoutText.length > 0){
            words = resultItem.layoutText[pageNum-1].words;
        }
        var words_in_line_counter = 0;
        var queryWords = query.split(/\s+/);
        var jpnRegex = /([\u3000-\u303f]|[\u3040-\u309f]|[\u30a0-\u30ff]|[\uff00-\uff9f]|[\u4e00-\u9faf]|[\u3400-\u4dbf])+/;        
        if (query.match(jpnRegex)){
            //split into single characters
            queryWords = query.split("");
        }

        for(var i = 0; i < words.length; i++){       
            var word = words[i];
            var boxProperties = getBoxProperties(word.boundingBox);
            var box = $( ".box.tmp" ).clone().css("display","block").attr("class","box act").attr("id","word_"+i).css("left", boxProperties.left)
            .css("top", boxProperties.top).css("width", boxProperties.width).css("height", boxProperties.height);
            if ( queryWords.includes(word.text)){
                $(box).css("background-color","rgba(255,255,0,0.5)").css("border","1px solid yellow");
            }else{
                $(box).css("background-color","transparent").css("border","none");
            }
            
            $ ("#image_wrapper").append(box);

            var textbox = $( ".textbox.tmp" ).clone().css("display","block").attr("class","box").attr("id","txt_word_"+i).html(word.text);
            if ( queryWords.includes(word.text)){
                $(textbox).css("background-color","rgba(255,255,0,0.5)").css("border","1px solid yellow");
            }else{
                $(textbox).css("background-color","transparent").css("border","none");
            }

            $ ("#text_wrapper").append(textbox);
            words_in_line_counter += 1;
            if (words_in_line_counter == 10){
                var html_text = $ ("#text_wrapper").html();
                $ ("#text_wrapper").html(html_text+"<br/>");
                words_in_line_counter = 0;
            }
        }
        docImg.off("load");
        var lines_to_highlight = sur_lines_pages[pageNum-1];
        //debug code, for showing all lines of text        
        //lines_to_highlight = lines_pages[pageNum-1]; //uncomment this line to show all text
        highlightLines(lines_to_highlight);
    });
}

function getBoxProperties(boundingBox){
    var xarray = [];
    var yarray = [];
    for(var i = 0; i < boundingBox.length; i++){
        xarray.push(boundingBox[i].x);
        yarray.push(boundingBox[i].y);
    }
    var left = Math.min(...xarray);
    var top = Math.min(...yarray);
    var right = Math.max(...xarray);
    var bottom = Math.max(...yarray);
    var width = right - left;
    var height = bottom - top;
    return {"left" : left, "top" : top, "width" : width, "height" : height};
}

function extract_entities_surgeries(resultItem){
    s_pages = [];//use as global variable
    sur_lines_pages = [];//use as global variable
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    lines_pages = [];// for showing all lines of text
    for (var i = 0; i < resultItem.layoutText.length; i++){
        var lines = resultItem.layoutText[i].lines;
        var s_line = lines.filter(x => x.text.match(/^手術$/) || x.text.match(/^手術料$/) || x.text.match(/^手術ト.*$/) );        
        var t_line = [];
        if(s_line.length > 0){
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => { //use filter() to get the boundingboxes (x) that are below 手術(s_line[0]) and in the same column (between leftLimit and rightLimit)
                var leftLimit =  x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;                
                return (left > leftLimit && left < rightLimit && top > topMinimum);
            }).reduce((prev, x) => { //use reduce() to get the topmost boundingbox (x), which is the boundingbox immediately below 手術(s_line[0]) and in the same column
                if (prev.length == 0){
                    var arr = [];
                    arr.push(x);
                    return arr;
                }else{
                    var prevTop = getBoxProperties(prev[0].boundingBox).top;
                    var xTop = getBoxProperties(x.boundingBox).top;                    
                    if (prevTop < xTop ){
                        return prev;
                    }else{                        
                        var arr = [];
                        arr.push(x);
                        return arr;
                    }                    
                }
            },[]);
            if (t_line.length > 0){
                var leftLimit =  x1 + 30;
                //var rightLimit = x1 + boxProps.width;
                var topMinimum = y1;
                var t_lineBoxProps = getBoxProperties(t_line[0].boundingBox);
                var topMaximum = t_lineBoxProps.top - 5;
                var sur_lines = [];
                sur_lines = lines.filter(x => {                    
                    var left = getBoxProperties(x.boundingBox).left;
                    var top = getBoxProperties(x.boundingBox).top;
                    return (left > leftLimit && top > topMinimum && top < topMaximum); 
                }).filter(x => !x.text.match(/^[0-9]+$/));
                sur_lines_pages.push(sur_lines);
                var sorted_sur_lines = sur_lines.sort((a,b) => { 
                    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
                });                
                sorted_sur_text = sorted_sur_lines.map(x => x.text);
                s_pages.push(sorted_sur_text.map((x, idx) => `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
                                                            +`<div class="col-lg-5 p-0">`
                                                            +`<span class="orig_text">${x}</span>`
                                                            +`</div>`
                                                            +`<div class="col-lg-4 p-0">`
                                                            +`<span class="corrected_text ml-2"></span>`
                                                            +`</div>`
                                                            +`<div class="col-lg-2 p-0">`
                                                            +`<span class="code_text ml-2"></span>`
                                                            +`<br/>`                                                            
                                                            +`<span class="kcode_text ml-2"></span>`
                                                            +`</div>`
                                                            +`<div class="col-lg-1 p-0">`
                                                            +`<i id="sur_icon_${idx}" class="fa fa-search sur_edit pl-1 ml-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-hidden="true" style="display:none"></i>`
                                                            +`<div class="dropdown-menu" aria-labelledby="sur_icon_${idx}"> </div>`
                                                            +`</div>`
                                                            +`</div>`).join(""));
            }else{
                s_pages.push("無し");
                sur_lines_pages.push([]);
            }           
            
        }else{
            s_pages.push("無し");
            sur_lines_pages.push([]);
        }
        // for showing all lines of text with the display toggle button
        lines_pages.push(lines);
    }
}

function extract_entities_dpc(resultItem){
    s_pages = [];//use as global variable
    sur_lines_pages = [];//use as global variable
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    lines_pages = [];// for showing all lines of text
    date_text = "";
    med_spec_text = "";
    for (var i = 0; i < resultItem.layoutText.length; i++){//iterate per page of document (1 layoutText -> 1 page)
        var lines = resultItem.layoutText[i].lines;
        // extract dpc entries start
        var s_line = lines.filter(x => x.text.match(/^DPC$/) || x.text.match(/^.*DPC$/) || x.text.match(/^DPC.*$/) || x.text.match(/^包括$/) || x.text.match(/^.*包括$/) || x.text.match(/^包括.*$/) );
        var t_line = [];
        if(s_line.length > 0){
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => {//use filter() to get the boundingboxes (x) that are below DPC(s_line[0]) and in the same column (between leftLimit and rightLimit)
                var leftLimit =  x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;
                if (x.text.match(/^DPC$/) || x.text.match(/^.*DPC$/) || x.text.match(/^DPC.*$/)){
                    return false;
                }else{
                    return (left > leftLimit && left < rightLimit && top > topMinimum); 
                }
            }).reduce((prev, x) => {//use reduce() to get the topmost boundingbox (x with smallest value of .top)
                if (prev.length == 0){
                    var arr = [];
                    arr.push(x);
                    return arr;
                }else{
                    var prevTop = getBoxProperties(prev[0].boundingBox).top;
                    var xTop = getBoxProperties(x.boundingBox).top;
                    if (prevTop < xTop ){
                        return prev;
                    }else{
                        var arr = [];
                        arr.push(x);
                        return arr;
                    }
                }
            },[]);
            if (t_line.length > 0){
                var leftLimit =  x1 + 30;
                //var rightLimit = x1 + boxProps.width;
                var topMinimum = y1;
                var t_lineBoxProps = getBoxProperties(t_line[0].boundingBox);
                var topMaximum = t_lineBoxProps.top - 5;
                var dpc_lines = [];
                dpc_lines = lines.filter(x => {                    
                    var left = getBoxProperties(x.boundingBox).left;
                    var top = getBoxProperties(x.boundingBox).top;
                    return (left > leftLimit && top > topMinimum && top < topMaximum); 
                });
                sur_lines_pages.push(dpc_lines);
                var dpc_lines_rows = getDpcEntriesFromOcrLines(dpc_lines);
                sorted_dpc_text = dpc_lines_rows.map(x => x.map(y => y.text));
                var dpc_label_row_text = `<div class="row no-gutters">`
                                    +`<div class="col-lg-5 p-0">`
                                    +`<span>項目名</span>`
                                    +`</div>`
                                    +`<div class="col-lg-3 p-0">`
                                    + `<span class="ml-2">単価点数</span>`
                                    +`</div>`
                                    +`<div class="col-lg-1 p-0">`
                                    + `<span class="ml-2">回数</span>`
                                    +`</div>`
                                    +`<div class="col-lg-2 p-0">`                                                                                                   
                                    + `<span class="ml-2">合計</span>`
                                    +`</div>`
                                    +`<div class="col-lg-1 p-0">`                                                            
                                    +`</div>`
                                    +`</div>`;
                s_pages.push(dpc_label_row_text
                             + sorted_dpc_text.map((x, idx) => {
                                                            let no_of_times, unit_price, total;                                                             
                                                            if(x[1]){
                                                                var unit_price_match = x[1].match(/[0-9]+/);
                                                                if (unit_price_match){
                                                                    unit_price=unit_price_match[0];
                                                                }
                                                            }
                                                            if(x[2]){
                                                                var total_match = x[2].match(/[0-9]+\.[0-9]+/);
                                                                if (total_match){
                                                                    total=total_match[0].replace(".","");
                                                                }
                                                                if (unit_price && total){
                                                                    no_of_times = parseInt(total) / parseInt(unit_price);
                                                                }
                                                            }

                                                            return `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
                                                            +`<div class="col-lg-5 p-0">`
                                                            +`<span>${x[0]}</span>`
                                                            +`</div>`
                                                            +`<div class="col-lg-3 p-0">`
                                                            + (unit_price?`<span class="ml-2">${unit_price}</span>`:"")
                                                            +`</div>`
                                                            +`<div class="col-lg-1 p-0">`                                                                                                   
                                                            + (no_of_times?`<span class="ml-2">${no_of_times}</span>`:"")
                                                            +`</div>`
                                                            +`<div class="col-lg-2 p-0">`                                                                                                   
                                                            + (total?`<span class="ml-2">${total}</span>`:"")
                                                            +`</div>`
                                                            +`<div class="col-lg-1 p-0">`                                                            
                                                            +`</div>`
                                                            +`</div>`
                                                        }).join(""));
            }else{
                s_pages.push("無し");
                sur_lines_pages.push([]);
            }           
            
        }else{
            s_pages.push("無し");
            sur_lines_pages.push([]);
        }
        // extract dpc entries end

        // extract date start
        var date_label_line = lines.filter(x => x.text.match(/受([\u3000-\u303f]|[\u3040-\u309f]|[\u30a0-\u30ff]|[\uff00-\uff9f]|[\u4e00-\u9faf]|[\u3400-\u4dbf]){1}期/));
        if (date_label_line.length > 0){
            var date_label_text = date_label_line[0].text;
            // check if date text is already included in the date_label line/bounding box
            var date_match = date_label_text.match(/([\u3000-\u303f]|[\u3040-\u309f]|[\u30a0-\u30ff]|[\uff00-\uff9f]|[\u4e00-\u9faf]|[\u3400-\u4dbf]){2}[0-9]+年.+月.+日.+年.+月.+日/)
            if (date_match){
               date_text ='<div><span>受診期間：'
                         + date_match[0]
                         + '</span></div>';
            }else{
                // get the bounding box to the right of date_label_line
                var boxProps = getBoxProperties(date_label_line[0].boundingBox);
                var leftLimit = boxProps.left + boxProps.width;
                var topMinimum = boxProps.top - 10;
                // TODO: filter lines using leftLimit, topMinimum
            }
        };
        // extract date end

        // extract medical specialty start
        var med_spec_label_line = lines.filter(x => x.text.match(/療科/));
        if (med_spec_label_line.length > 0){
            var med_spec_label_text = med_spec_label_line[0].text;
            // check if medical specialty text is already included in the med_spec_label line/bounding box
            var med_spec_match = med_spec_label_text.match(/療科(([\u3000-\u303f]|[\u3040-\u309f]|[\u30a0-\u30ff]|[\uff00-\uff9f]|[\u4e00-\u9faf]|[\u3400-\u4dbf])+)$/)
            if (med_spec_match){
                med_spec_text ='<div><span>診療科：'
                         + med_spec_match[1]
                         + '</span></div>';
            }else{
                // get the bounding box to the right of date_label_line
                var boxProps = getBoxProperties(med_spec_label_line[0].boundingBox);
                var leftLimit = boxProps.left + boxProps.width;
                var topMinimum = boxProps.top - 10;
                // TODO: filter lines using leftLimit, topMinimum
            }
        };
        // extract medical specialty end

        // for showing all lines of text with the display toggle button
        lines_pages.push(lines);
    }
}

function getDpcEntriesFromOcrLines(lines){
    //sort by vertical position - topmost first
    var sorted_lines = lines.sort((a,b) => { 
        return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
    });
    //get dpc entries
    var resultEntries = [];
    var isEntryStarted = false;
    var entry = [];
    for (var i = 0; i < sorted_lines.length; i++){
        var text = sorted_lines[i].text;
        if (text.match(/入院/)){
            if (isEntryStarted){
                resultEntries.push(entry);
                entry = [];
                entry.push(lines[i]);
            }else{
                isEntryStarted = true;
                entry.push(lines[i]);
            }
        }else{
            if (isEntryStarted && text.match(/[0-9]+/)){
                entry.push(lines[i]);
            }else{
                if (entry.length > 0){
                    resultEntries.push(entry);
                    entry = [];
                }
                isEntryStarted = false;
            }
        }

        if (i == sorted_lines.length-1){
            if (entry.length > 0){
                resultEntries.push(entry);
            }
        }
    }    
    return resultEntries;
}

function getWikipediaLinksHtml(array){
    return array.reduce(function(accumulator, item, index){
        //add leading comma only after first item
        //also strip double-byte space and single-byte space from item
        if (index == 0){            
            return accumulator + `<a href="${wiki_url+item.replace(/[ 　]/g,"")}" target="_blank" rel="noopener noreferrer">${item}</a>`;
        }else{            
            return accumulator + "," +`<a href="${wiki_url+item.replace(/[ 　]/g,"")}" target="_blank" rel="noopener noreferrer">${item}</a>`;
        }
    },"");
}

/**pdf viewer start */

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    $('#page_num').text(pageNum);    
    display_ocr_image(doc_result_item);
    display_entities();
    
}

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= numPages) {
        return;
    }
    pageNum++;
    $('#page_num').text(pageNum);
    display_ocr_image(doc_result_item);
    display_entities();
    
}

/**pdf viewer end */

function highlightLines(lines){
    for(var i = 0; i < lines.length; i++){       
        var line = lines[i];
        var boxProperties = getBoxProperties(line.boundingBox);
        var box = $( ".box.tmp" ).clone().css("display","block").attr("class","box act").attr("id","line_"+i).css("left", boxProperties.left)
        .css("top", boxProperties.top).css("width", boxProperties.width).css("height", boxProperties.height);
        
        $(box).css("background-color","rgba(0,255,0,0.5)").css("border","1px solid green");
        
        
        $ ("#image_wrapper").append(box);
    }
}

function resetEditModeDisplay(){
    $('.fa.fa-search.sur_edit').css('display','none');    
    $('#edit_mode_label').css('visibility', 'hidden');
    $('#analyze_in_progress').css('display', 'none');
    $('#analyze_finished').css('display', 'none');
    $('#file_entities').css('border', 'none');    
}

//returns list of closest matching words in json format
// [ {text:"",code:"",kcode:""}, ...]
function getClosestWords(query, callback){
    $.ajax({
        url: window.location.origin + "/closestwords",
        method: "get",
        contentType: "application/json; charset=utf-8",
        data:{
            "query":query
        },
        success: function(result) {
            //closestwords api returns list of closest matching words in json format
            var responseJson = JSON.parse(result);
            callback(responseJson);
        },
        error: function(){
            callback("error");
        }
    });
}

//returns string: Surgery_Type, Injection_Med, or Irrelevant
function getWordClassification(query, callback){
    $.ajax({
        url: window.location.origin + "/classifyword",
        method: "get",
        contentType: "application/json; charset=utf-8",
        data:{
            "query":query
        },
        success: function(result) {  
            //classifyword api returns string: Surgery_Type, Injection_Med, or Irrelevant
            callback(result);
        },
        error: function(){
            callback("error");
        }
    });
}

function editModeButtonOnClick(){    
        //$('.fa.fa-search.sur_edit').css('display','inline-block');
        $('#edit_mode_label').css('visibility', 'visible');
        $('#analyze_in_progress').css('display', 'inline-block');
        $('#file_entities').css('border', 'dotted 1px red');
        var surgery_text_div = $('#file_entities div.sur_drop span.orig_text');
        if (surgery_text_div.length > 0){
            var in_progress_count = surgery_text_div.length;
            //use .each() here instead of normal for loop so that value of i is retained inside getClosestWords callback( function(result){} )
            $('#file_entities div.sur_drop span.orig_text').each( function (i, item){
                var query = surgery_text_div[i].innerText;
                getClosestWords(query, function(result){
                    if (result.length > 0){
                        $(`#sur_${i} span.corrected_text`).text(result[0].text);
                        $(`#sur_${i} span.code_text`).text(result[0].code);
                        if (result[0].kcode){
                            $(`#sur_${i} span.kcode_text`).text(result[0].kcode);
                        }else{
                            $(`#sur_${i} span.kcode_text`).text("");
                        }
                        var dropdown_menu_div = $(`#sur_${i} div.dropdown-menu`);
                        dropdown_menu_div.html(result.map((x)=>`<a class="dropdown-item" href="#">${x.text}</a>`).join(""));
                        $('a.dropdown-item').click(editDropdownItemOnClick);
                        $(`#sur_${i} .fa.fa-search.sur_edit`).css('display','inline-block');
                    }else{
                        $(`#sur_${i} span.corrected_text`).text("");
                        $(`#sur_${i} span.code_text`).text("");
                        $(`#sur_${i} span.kcode_text`).text("");
                        $(`#sur_${i} .fa.fa-search.sur_edit`).css('display','none');
                    }
                    in_progress_count--;
                    if (in_progress_count == 0){
                        $('#analyze_in_progress').css('display', 'none');
                        $('#analyze_finished').css('display', 'inline-block');
                    }                    
                });
            });         
        }else{
            $('#analyze_in_progress').css('display', 'none');
            $('#analyze_finished').css('display', 'inline-block');
        }
}

function editDropdownItemOnClick(event){
    var dropdownItem = $(event.currentTarget);
    var dropdownMenu = dropdownItem.parent();
    var parentDiv = $(dropdownMenu).parents('div.sur_drop');
    var correctedText = dropdownItem.text();
    //search descendants for span with class corrected_text
    $(parentDiv).find('span.corrected_text').text(correctedText);
}

function exportButtonOnClick(){
    var entities_div = $('#file_entities div.sur_drop');
    var entities_list = [];
    entities_div.each( function(i,item){
        if ($(item).find('span.corrected_text')[0].innerText != ""){
            var text = $(item).find('span.corrected_text')[0].innerText;
            var code = $(item).find('span.code_text')[0].innerText;             
            var kcode = $(item).find('span.kcode_text')[0].innerText;
            var list_item = {"text":text, "code":code, "kcode":kcode};
            entities_list.push(list_item);
        }
    });
    var docname = $('h5.modal-title').text();
    $.ajax({
        url: window.location.origin + "/entitiesexport",
        method: "post",
        contentType: "application/json; charset=utf-8",
        data:JSON.stringify({
            "list":entities_list,
            "docname": docname
        }),
        success: function(result) {  
            $('a#entities_export').attr('href',result);
            $('a#entities_export')[0].click();
        },
        error: function(){
            console.log("error");
        }
    });

}

function toggleOCRDisplay(event){
    //clear all ocr highlight boxes first
    $(".box.act").remove();    
    // for showing all lines of text
    var lines_to_highlight = lines_pages[pageNum-1];
    if ( event.currentTarget.id == "option_display_specific"){
        // for showing only surgeries or dpc lines of text
        lines_to_highlight = sur_lines_pages[pageNum-1];
    }    
    highlightLines(lines_to_highlight);
}