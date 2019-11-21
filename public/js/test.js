$( document ).ready( function() {

    var docImg = $( "#docImg" );
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

    $.ajax({
        url: window.location.origin + "/testjson",
        method: "get",
        contentType: "application/json; charset=utf-8",
        success: function(result) {
            var responseJson = JSON.parse(result);
            var words = responseJson.words;
            words.forEach( function(word){
                var boxProperties = getBoxProperties(word.boundingBox);
                var box = $( ".box.tmp" ).clone().css("display","block").attr("class","box").css("left", `${boxProperties.left+8}`)
                .css("top", `${boxProperties.top+8}`).css("width", boxProperties.width).css("height", boxProperties.height);
                $ (".main").append(box);
            });
        },
        error: function(){}
    });

});

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