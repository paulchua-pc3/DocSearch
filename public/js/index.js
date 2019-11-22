
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

    $("#filename_link").click(function() {
        var src = "https://www.nlpacademy.co.uk/images/uploads/whatisnlp.jpg";
        var filename = "filename";
        var entities = "entities, people, organization, location";

        display_filePreview(src, filename, entities);
    });

    $("#search-form").submit(function(event){
        event.preventDefault();
        var query = $("input[name='search']").val();

        $.ajax({
            url: "/search",
            method: "post",
            data: JSON.stringify({"query":query}),
            contentType: "application/json; charset=utf-8",
            success: function(result){
                console.log("result", result);
                
            },
            error: function (error) {
                console.log("error on search:", error);                
            }
        });
    });
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
            }
        },
        error: function(){}
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
    if (results.length > 0) {
        $("#results_label").html("Results");
    }
}

function display_results(results){
    var new_result = $(".res.template").clone().attr("class", "res");
    var new_filename = $(".filename").clone().attr("class", "filename");
    var results_filename = results.filename;
    new_filename.find("p").html(results_filename);
    $(".res").append(new_filename);

    for (var i = 0; i < results.snippets.length; i++) {
        var new_filesnippet = $(".snippet").clone().css("display", "block").attr("class", "snippet");
        var results_snippet = results.snippets[i].text;
        new_filesnippet.find("p").html(results_snippet);
        $(".res").append(new_filesnippet);
    }

    //$("#results").append(new_result);
}

function display_filePreview(src, filename, entities){
    $("#modal-label").html(filename);
    $("#files_modal_body").html("<img src=\""+ src +"\" style=\"width:250px;height:250px\"></img>");
    $("#file_entities").html(entities);
}
