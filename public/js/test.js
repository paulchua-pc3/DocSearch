let responseJson;



$( document ).ready( function() {

    var url = 'https://blobstorageforsearch.blob.core.windows.net/doccontainer/2017-Scrum-Guide-Japanese.pdf';

    var pdfjsLib = window['pdfjs-dist/build/pdf'];

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.3.200/pdf.worker.js';

    var pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 0.8,
        canvas = document.getElementById('the-canvas'),    
        ctx = canvas.getContext('2d');
    
      /**
       * Get page info from document, resize canvas accordingly, and render page.
       * @param num Page number.
       */
      function renderPage(num) {
          pageRendering = true;
          // Using promise to fetch the page
          pdfDoc.getPage(num).then(function(page) {
            var viewport = page.getViewport({scale: scale});
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
          document.getElementById('page_num').textContent = num;
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

        document.getElementById('prev').addEventListener('click', onPrevPage);
        document.getElementById('next').addEventListener('click', onNextPage);
          
        /**
         * Asynchronously downloads PDF.
         */
        pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
          pdfDoc = pdfDoc_;
          document.getElementById('page_count').textContent = pdfDoc.numPages;

          // Initial/first page rendering
          renderPage(pageNum);

        });


    /*var urlpath = "/testjson/2"//for demo only
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
    });*/

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


