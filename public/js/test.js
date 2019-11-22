let responseJson;
$( document ).ready( function() {   
    var urlpath = "/testjson/2"//for demo only
    if (window.location.search==""){//for demo only
        urlpath = "/testjson/1"//for demo only
    }
    $.ajax({
        url: window.location.origin + urlpath,
        method: "get",
        contentType: "application/json; charset=utf-8",
        success: function(result) {            
            var responseJson = JSON.parse(result);
            $("#docImg").attr("src", responseJson.filename_demo);//for demo only
            $( "#docImg" ).on("load", function(){

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