
$( document ).ready( function() {

    $("#updateIndex").click(function(){
        run_indexer();
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
    var result = get_indexer_status();    
    if (result == "running"){
        $(".indexerStatus h3").html("Indexer Execution in Progress...");
        setTimeout(wait_indexer_finished, 5000);
    }else if(result == "success"){
        $(".indexerStatus h3").html("Indexer Execution Complete.");
    }else{
        $(".indexerStatus h3").html("Error in Indexer Execution.");
    }    
}

function get_indexer_status(){
    $.ajax({
        url: window.location.origin + "/indexer/status",
        method: "get",
        contentType: "application/json; charset=utf-8",
        success: function(result) {
            var responseJson = JSON.parse(result);
            if (responseJson.status){
                return responseJson.status;
            }else{
                //error unable to get status
                return "error";
            }
        },
        error: function(){
            return "error";
        }
    });
}