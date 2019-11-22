
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
                $("#upload-message").html(result);
            },
            error: function (error) {
                console.log("error on upload:", error);                
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
                $("#indexerStatus").html("Indexer Execution Complete.");
            }else{
                $("#indexerStatus").html("Error in Indexer Execution.");
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

function display_filePreview(src, filename, text){
    $("#modal-label").html(filename);
    $("#file_preview").html("<iframe src=\'+src+\"></iframe>");
    $("#file_text").html(text);
    $("#files_modal").modal('show');
}
