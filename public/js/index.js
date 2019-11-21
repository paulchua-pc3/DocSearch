
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
                $(".indexerStatus h3").html("Indexer Execution in Progress...");
                setTimeout(wait_indexer_finished, 5000);
            }else if(result == "success"){
                $(".indexerStatus h3").html("Indexer Execution Complete.");
            }else{
                $(".indexerStatus h3").html("Error in Indexer Execution.");
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