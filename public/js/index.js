
var query = "";
var resultsJson = {};
const wiki_url = "https://ja.wikipedia.org/wiki/";

//sorted 手術 text; used first in display_file
var sorted_sur_text = [];

/**pdf viewer start */
var pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 1.0,
        canvas = null,
        ctx = null,
        pdfjsLib = null;
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

    $("#search-form").submit(function(event){
        event.preventDefault();
        $(".results").html("");//clear result area
        query = $("input[name='search']").val();
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
    pdfjsLib = window['pdfjs-dist/build/pdf'];

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.3.200/pdf.worker.js';
    
    // can't get sizing to work when using jquery selectors, so comment for now
    //canvas = $('#the-canvas');
    //ctx = canvas.get(0).getContext('2d');
    canvas = document.getElementById('the-canvas'),    
    ctx = canvas.getContext('2d');    

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

});
 
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
    /**pdf viewer start */
    if (filename.match(/\.pdf$/i) != null){
        pageNum = 1;
        pageRendering = false;
        pageNumPending = null;
        $('#image_viewer').css("display","none");
        $('#pdf_viewer').css("display","block");
        var uri = resultItem.fileUri;
        /**
         * Asynchronously downloads PDF.
         */
        pdfjsLib.getDocument(uri).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            $('#page_count').text(pdfDoc.numPages);

            // Initial/first page rendering
            renderPage(pageNum);

        });
    /**pdf viewer end */        
    }else{
        $('#pdf_viewer').css("display","none");
        $('#image_viewer').css("display","block");
        display_ocr_image(resultItem);
    }

    var s_pages = [];
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    for (var i = 0; i < resultItem.layoutText.length; i++){
        var lines = resultItem.layoutText[i].lines;
        var s_line = lines.filter(x => x.text.match(/^手術$/) || x.text.match(/^手術料$/) || x.text.match(/^手術ト.*$/) );
        var t_line = [];
        if(s_line.length > 0){
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => {
                var leftLimit =  x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;
                return (left > leftLimit && left < rightLimit && top > topMinimum); 
            }).reduce((prev, x) => {               
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
                highlightLines(sur_lines);
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
            }           
            
        }else{
            s_pages.push("無し");
        }
    }
    var surText = "";
    if (s_pages.length > 0){
        surText = s_pages.join(" <br/>---<br/> ");
    }

    var keyphrasesText = resultItem.keyphrases.slice(0,10).join(",")+",...";
    var organizationsText = getWikipediaLinksHtml(resultItem.organizations);
    var locationsText = getWikipediaLinksHtml(resultItem.locations);
    var peopleText = resultItem.people.join(",");
    var datetimeText = resultItem.datetime.join(",");
    var symptomsText = resultItem.symptoms.filter(x => x!="\n").join(",");
    var entitiesDiv = $( "#file_entities" );
    entitiesDiv.html(surText);
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

function display_ocr_image(resultItem) {
    //clear all ocr highlight boxes first
    $(".box.act").remove();
    var docImg = $( "#docImg" );
    docImg.css("width", "");
    docImg.css("height", "");  
    var uri = resultItem.fileUri;
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
            words = resultItem.layoutText[0].words;
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
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
    pageRendering = true;
    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        var viewport = page.getViewport({scale: scale});
        // can't get sizing to work when using jquery selectors, so comment for now
        //canvas.css("height", viewport.height);
        //canvas.css("width", viewport.width);
        canvas.height = viewport.height;
        canvas.width = viewport.width;    

        // Render PDF page into canvas context
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
            // New page rendering is pending
            renderPage(pageNumPending);
            pageNumPending = null;
            }
        });
    });

    // Update page counters
    $('#page_num').text(num);
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
    if (pageRendering) {
    pageNumPending = num;
    } else {
    renderPage(num);
    }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
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