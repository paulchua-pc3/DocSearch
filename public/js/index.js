
var resultsJson = {};

$( document ).ready( function() {

    $("#updateIndex").click(function(){
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
        var query = $("input[name='search']").val();

        $.ajax({
            url: "/search",
            method: "post",
            data: JSON.stringify({"query":query}),
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

    $('#files_modal').on('show.bs.modal', function (event) {
        var link = $(event.relatedTarget);
        var modal = $(this)
        display_file(modal, link);
    })
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
    results.forEach( function (result){
        var new_row = $(".row.template").clone().attr("class", "row");
        var new_col = $(".col.template").clone().attr("class", "col");
        var new_result = $(".res.template").clone().attr("class", "res");
        var new_filename = $(".filename_link.template").clone().attr("class", "filename_link");
        var result_filename = result.filename;
        new_filename.html(result_filename);
        $(new_result).append(new_filename);

        for (var i = 0; i < result.snippets.length; i++) {
            var new_filesnippet = $("div.snippet.template").clone().css("display", "block").attr("class", "snippet");
            var result_snippet = result.snippets[i];
            new_filesnippet.find("p").html(result_snippet);
            $(new_result).append(new_filesnippet);
            var html = $(new_result).html();
            $(new_result).html(html+"<hr>");
        }

        $(new_col).append(new_result);
        $(new_row).append(new_col);
        $(".results").append(new_row);
    });
}

function display_file(modal, link){
    var filename = link.html();
    modal.find('.modal-title').text(filename);
    modal.find('#docImg').attr("src",filename);
}

function display_ocr_image(result) {            
    var responseJson = JSON.parse(result);
    var docImg = $( "#docImg" );    
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
    var words = responseJson.words;
    var words_in_line_counter = 0;
    for(var i = 0; i < words.length; i++){       
        var word = words[i];
        var boxProperties = getBoxProperties(word.boundingBox);

        var box = $( ".box.tmp" ).clone().css("display","block").attr("class","box").attr("id","word_"+i).css("left", boxProperties.left)
        .css("top", boxProperties.top).css("width", boxProperties.width).css("height", boxProperties.height);
        if ( ["決","済","和","田"].includes(word.text)){
            $(box).css("background-color","rgba(255,255,0,0.5)").css("border","1px solid yellow");
        }else{
            $(box).css("background-color","transparent").css("border","none");
        }
        
        $ ("#image_wrapper").append(box);

        var textbox = $( ".textbox.tmp" ).clone().css("display","block").attr("class","box").attr("id","txt_word_"+i).html(word.text);
        if ( ["決","済","和","田"].includes(word.text)){
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
});
}
