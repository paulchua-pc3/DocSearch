
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
        $(".results").html("");//clear result area
        var query = $("input[name='search']").val();

        $.ajax({
            url: "/search",
            method: "post",
            data: JSON.stringify({"query":query}),
            contentType: "application/json; charset=utf-8",
            success: function(results){
                var resultsJson = JSON.parse(results);
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
        modal.find('.modal-title').text(link.html());
        modal.find('#docImg').attr("src",link.html());
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

function display_filePreview(src, filename, entities){
    $("#modal-label").html(filename);
    $("#files_modal_body").html("<img src=\""+ src +"\" style=\"width:250px;height:250px\"></img>");
    $("#file_entities").html(entities);
}
