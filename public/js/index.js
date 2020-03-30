var query = "";
var resultsJson = {};
const wiki_url = "https://ja.wikipedia.org/wiki/";

//used to store the json data for the document being viewed in the modal
var doc_result_item = null;

//container for sur_lines; 1 page : 1 sur_lines; used first in display_file
var sur_lines_pages = [];

//container for sorted_sur_text; 1 page : 1 sorted_sur_text; used first in display_file
var s_pages = [];
var s_pages_items = [];

//sorted 手術 text; used first in display_file
var sorted_sur_text = [];

//date text of 受診期間; used first in extract_entities_dpc
var date_text = "";

//text of 診療科; used first in extract_entities_dpc
var med_spec_text = "";

//debug code, for showing all lines of text
var lines_pages = [];

//added: M.Seras (2020/02/04) - Added array for illnesses     
//array for illnesses from csv file
var illness = null;

//added: P. Chua (2020/02/14) - added debug function
//variable for displayed image
var dispImage = null;

//added: P. Chua (2020/02/26) - added items extraction function
//container for items lines in lines_pages
var items_lines_pages = [];

//added: M.Seras (2020/03/04) - Added global var for width and height from ocr image  
var gWidth = null;
var gHeight = null;

var SearchModeEnum = {
    "Standard": "standard",
    "Surgeries": "surgeries",
    "DPC": "dpc"
}

//standard, surgeries, dpc
var search_mode = SearchModeEnum.Standard;

/**pdf viewer start */
var pdfDoc = null,
    pageNum = 1,
    numPages = 0;
/**pdf viewer end */

$(document).ready(function () {

    //added: M.Seras (2020/02/04) - Retrieve data from illness.csv file
    $.ajax({
        type: "GET",
        url: "illness.csv",
        dataType: "text",
        output: "",
        success: function processCSVData(data) {
            illness = data.split(',');
        }
    });

    $("#updateIndex").click(function () {
        event.preventDefault();//prevent submit action
        run_indexer();
    });

    $("#upload-form").submit(function (event) {
        event.preventDefault();
        var formData = new FormData(this);
        console.log(formData)
        $.ajax({
            type: "post",
            url: "/upload",
            data: formData,
            processData: false,
            contentType: false,
            success: function (result) {
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

    $("#search_btn").click(execute_search);// main/general-purpose search button
    $("#sur_search").click(execute_search);// search button for surgeries
    $("#dpc_search").click(execute_search);// search button for DPC/入院

    // allows the user to execute search using "enter" key
    $("input[name='search']").keypress(function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            execute_search(event);
        }
    });

    $('#clear_filters').click(function () {
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
    $('#prev').click(onPrevPage);
    $('#next').click(onNextPage);
    /**pdf viewer end */

    /**edit mode start*/
    $('#edit-btn').click(editModeButtonOnClick);
    $('#cancel-btn').click(function () {
        resetEditModeDisplay();
        //undo changes logic here
    });
    $('#export-btn').click(exportButtonOnClick);
    $('#export-btn2').click(exportAllButtonOnClick);
    /**edit mode end*/

    //added: P. Chua (2020/02/14) - added debug function
    /**debug mode start*/
    $('#debug-btn').click(debugButtonOnClick);

    $('#debug_modal').on('show.bs.modal', function (event) {
        var link = $(event.relatedTarget);
        var modal = $(this);
        modal.find('.modal-title').text("");
        modal.find('.modal-page').text("");

        modal.find('.modal-title').text(doc_result_item.filename);
        if (numPages > 1) {
            modal.find('.modal-page').text("ページ：" + pageNum + "/" + numPages);
        }
        display_ocr_image(doc_result_item, true);
        toggleOCRDisplay(event, true);
        display_entities(true);
    })
    /**debug mode end*/

    $('#display_buttons input').change(toggleOCRDisplay);

    // added: M. Seras (2020/03/02) - change display for coordinate div on click
    $('#label_display_specific').click(function () {
        $('#coordinates_selection').removeClass('visible');
        $('#coordinates_selection').addClass('d-none');
        $('#coordinates_selection').addClass('invisible');
    });

    $('#label_display_all').click(function () {
        $('#coordinates_selection').removeClass('visible');
        $('#coordinates_selection').addClass('d-none');
        $('#coordinates_selection').addClass('invisible');
    });

    $('#label_display_items').click(function () {
        $('#coordinates_selection').removeClass('d-none');
        $('#coordinates_selection').removeClass('invisible');
        $('#coordinates_selection').addClass('visible');
    });

    $('#getKoumokumei-btn').click(function () {
        $(".box.act").remove();
        extract_entities_items(doc_result_item);
        // for showing only items of text
        lines_to_highlight = items_lines_pages[pageNum - 1];
        display_entities();
        highlightLines(lines_to_highlight, false);
    });

    $('#getTopLeft-btn').click(function () {
        $('#getTopLeft-btn').prop('disabled', true);
        $('#getTopLeftInfo').removeClass('invisible');
        $('#getTopLeftInfo').removeClass('d-none');
        $('#getTopLeftInfo').addClass('visible');
        $('#docImg').css('cursor', 'crosshair');

        $("#docImg").on("click", function (event) {
            var coords = relMouseCoords(event);
            var canvasX = coords.x;
            var canvasY = coords.y;

            $('#x1').text(canvasX);
            $('#y1').text(canvasY);

            $('#docImg').css('cursor', 'auto');
            $('#getTopLeftInfo').removeClass('visible');
            $('#getTopLeftInfo').addClass('invisible');
            $('#getTopLeftInfo').addClass('d-none');
            $('#getTopLeft-btn').prop('disabled', false);

            $("#docImg").prop("onclick", null).off("click");
        });
    });

    $('#getBottomRight-btn').click(function () {
        $('#getBottomRight-btn').prop('disabled', false);
        $('#getBottomRightInfo').removeClass('invisible');
        $('#getBottomRightInfo').removeClass('d-none');
        $('#getBottomRightInfo').addClass('visible');
        $('#docImg').css('cursor', 'crosshair');

        $("#docImg").on("click", function (event) {
            var coords = relMouseCoords(event);
            var canvasX = coords.x;
            var canvasY = coords.y;

            $('#x2').text(canvasX);
            $('#y2').text(canvasY);

            $('#docImg').css('cursor', 'auto');
            $('#getBottomRightInfo').removeClass('visible');
            $('#getBottomRightInfo').addClass('invisible');
            $('#getBottomRightInfo').addClass('d-none');
            $('#getBottomRight-btn').prop('disabled', false);

            $("#docImg").prop("onclick", null).off("click");
        });
    });
});

function execute_search(event) {
    event.preventDefault();
    $(".results").html("");//clear result area

    //set query based on button clicked
    var currentTarget = event.currentTarget.id
    if (currentTarget && currentTarget == "sur_search" || currentTarget == "dpc_search") {

        if (currentTarget == "sur_search") {
            search_mode = SearchModeEnum.Surgeries;
            //use predefined query for surgeries
            query = "手術";
        } else if (currentTarget == "dpc_search") {
            search_mode = SearchModeEnum.DPC;
            //use predefined query for DPC/入院
            query = "DPC 包括";
        }

    } else {
        search_mode = SearchModeEnum.Standard;
        //use user's input as query
        query = $("input[name='search']").val();
    }
    org = $('#filter_org').val();
    people = $('#filter_people').val();
    loc = $('#filter_loc').val();
    year = $('#filter_year').val();

    filter = "";
    has_filter = false;
    if (org) {
        filter += "organizations/any(o: o eq " + "\'" + org.replace(/^\s+|\s+$/g, '') + "\')";
        has_filter = true;
    }
    if (people) {
        if (org) {
            filter += " and ";
        }
        filter += "people/any(p: p eq " + "\'" + people.replace(/^\s+|\s+$/g, '') + "\')";
        has_filter = true;
    }
    if (loc) {
        if (org || people) {
            filter += " and ";
        }
        filter += "locations/any(l: l eq " + "\'" + loc.replace(/^\s+|\s+$/g, '') + "\')";
        has_filter = true;
    }
    if (year) {
        if (org || people || loc) {
            filter += " and ";
        }
        filter += "datetime/any(d: d eq " + "\'" + year.replace(/^\s+|\s+$/g, '') + "\')";
        has_filter = true;
    }
    if (!has_filter) {
        filter = "";
    } else {
        encoded_filter = encodeURIComponent(filter);
        filter = "&" + encodeURIComponent("$filter") + "=" + encoded_filter;
    }
    console.log("Search is sent.");

    $.ajax({
        url: "/search",
        method: "post",
        data: JSON.stringify({ "query": query, "filter": filter }),
        contentType: "application/json; charset=utf-8",
        success: function (results) {
            console.log("Search success.");

            resultsJson = JSON.parse(results);
            display_results(resultsJson);
        },
        error: function (error) {
            console.log("error on search:", error);
        }
    });
}

function run_indexer() {
    $.ajax({
        url: window.location.origin + "/indexer/run",
        method: "post",
        contentType: "application/json; charset=utf-8",
        success: function (result) {
            var responseJson = JSON.parse(result);
            if (responseJson.result && responseJson.result == "success") {
                wait_indexer_finished();
            } else {
                //error
                alert("Error in Starting Indexer.");
            }
        },
        error: function () {
            alert("Error in Starting Indexer.");
        }
    });
}

function wait_indexer_finished() {
    get_indexer_status(function (result) {
        if (result == "inProgress") {
            $("#indexerStatus").html("Indexer Execution in Progress...");
            setTimeout(wait_indexer_finished, 5000);
        } else if (result == "success") {
            $("#indexerStatus").html("");
            alert("Indexer Execution Complete.");
            //$("#indexerStatus").html("Indexer Execution Complete.");
        } else {
            $("#indexerStatus").html("");
            alert("Error in Indexer Execution.");
            //$("#indexerStatus").html("Error in Indexer Execution.");
        }
    });
}

function get_indexer_status(callback) {
    $.ajax({
        url: window.location.origin + "/indexer/status",
        method: "get",
        contentType: "application/json; charset=utf-8",
        success: function (result) {
            var responseJson = JSON.parse(result);
            if (responseJson.status) {
                callback(responseJson.status);
            } else {
                //error unable to get status
                callback("error");
            }
        },
        error: function () {
            callback("error");
        }
    });
}

//To confirm
function display_resultsLabel(results) {
    var countString = "";
    if (results.length > 0) {
        countString = ` (${results.length})`
        $("#results_label").html("Results" + countString);
    } else {
        $("#results_label").html("No Result Found");
    }
}

function display_results(results) {
    display_resultsLabel(results);
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var new_row = $(".row.template").clone().attr("class", "row");
        var new_col = $(".col.template").clone().attr("class", "col");
        var new_result = $(".res.template").clone().attr("class", "res");
        var new_filename = $(".filename_link.template").clone().attr("class", "filename_link");
        new_filename.attr("id", "file" + i.toString());
        var result_filename = result.filename;
        new_filename.html(result_filename);
        $(new_result).append(new_filename);

        for (var j = 0; j < result.snippets.length; j++) {
            var new_filesnippet = $("div.snippet.template").clone().css("display", "block").attr("class", "snippet");
            var result_snippet = result.snippets[j];
            new_filesnippet.find("p").html(result_snippet);
            $(new_result).append(new_filesnippet);
            var html = $(new_result).html();
            $(new_result).html(html + "<hr>");
        }

        $(new_col).append(new_result);
        $(new_row).append(new_col);
        $(".results").append(new_row);
    }
}

function display_file(modal, link) {
    resetEditModeDisplay();
    var filename = link.html();
    modal.find('.modal-title').text(filename);
    var fileId = link.attr("id");
    var resultIndex = parseInt(fileId.split("file")[1]);
    var resultItem = resultsJson[resultIndex];
    doc_result_item = resultItem;
    pageNum = 1;
    numPages = resultItem.normalizedImages.length;
    $('#page_count').text(numPages);
    $('#pdf_viewer').css("display", "none");
    $('#image_viewer').css("display", "block");
    if (search_mode == SearchModeEnum.Surgeries) {
        extract_entities_surgeries(resultItem);
    } else if (search_mode == SearchModeEnum.DPC) {
        extract_entities_dpc(resultItem);
    } else {
        extract_entities_keyword(resultItem, $("input[name='search']").val());
    }
    display_ocr_image(resultItem);
    $('#page_num').text(pageNum);
    display_entities();
    /*if (s_pages.length > 0){
        surText = s_pages.join(" <br/>---<br/> ");
    }*/

    var keyphrasesText = resultItem.keyphrases.slice(0, 10).join(",") + ",...";
    var organizationsText = getWikipediaLinksHtml(resultItem.organizations);
    var locationsText = getWikipediaLinksHtml(resultItem.locations);
    var peopleText = resultItem.people.join(",");
    var datetimeText = resultItem.datetime.join(",");
    var symptomsText = resultItem.symptoms.filter(x => x != "\n").join(",");

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

function display_entities(debug = false) {
    var surText = "";
    //debug code start, for showing all text 
    //uncomment this section to show all text
    //var sorted_lines = lines_pages[pageNum-1].sort((a,b) => { 
    //    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
    //});
    //sorted_text = sorted_lines.map(x => x.text);
    //surText = sorted_text;
    //debug code end

    if (search_mode == SearchModeEnum.DPC) {
        if (debug) {
            $("#entities_label1").text("DPC");
        } else {
            $("#entities_label").text("DPC");
        }
        surText += date_text;
        surText += med_spec_text;

    } else if (search_mode == SearchModeEnum.Surgeries) {
        if (debug) {
            $("#entities_label1").text("手術");
        } else {
            $("#entities_label").text("手術");
        }
    } else {
        if (debug) {
            $("#entities_label1").text($("input[name='search']").val());
        } else {
            $("#entities_label").text($("input[name='search']").val());
        }
    }

    if (s_pages[pageNum - 1]) {
        var isItemsChecked = document.getElementById("option_display_items").checked;
        if (isItemsChecked) {
            if (s_pages_items.length > 0) {
                surText += s_pages_items[pageNum - 1];
            }
        } else {
            surText += s_pages[pageNum - 1];
        }
    }

    var entitiesDiv;
    if (debug) {
        entitiesDiv = $("#file_entities1");
    } else {
        entitiesDiv = $("#file_entities");
    }
    entitiesDiv.html(surText);
}

//updated: P. Chua (2020/02/14) - added debug function
function display_ocr_image(resultItem, debug = false) {
    //clear all ocr highlight boxes first
    $(".box.act").remove();
    var docImg1;
    var docImg2;
    if (debug) {
        docImg1 = $("#docImg2");
        docImg2 = $("#docImg1");

        docImg2.css("width", "");
        docImg2.css("height", "");
    } else {
        docImg1 = $("#docImg");
    }
    //added: M. Seras (2020/02/13) - added zoom out function
    var imgWrapper1;
    var imgWrapper2;
    if (debug) {
        imgWrapper1 = $("#image_wrapper2");
        imgWrapper2 = $("#image_wrapper1");
    } else {
        imgWrapper1 = $("#image_wrapper");
    }
    docImg1.css("width", "");
    docImg1.css("height", "");
    var uri = resultItem.fileUri;
    if (uri.match(/\.pdf$/i) != null) {
        dispImage = JSON.parse(resultItem.normalizedImages[pageNum - 1]);
        uri = "data:image/png;base64," + dispImage.data;
    }

    if (debug) {
        docImg2.attr("src", uri);
        docImg2.attr("img", resultItem.normalizedImages[pageNum - 1])
        docImg2.on("load", function () {
            var width = docImg2.prop("naturalWidth");
            var height = docImg2.prop("naturalHeight");
            var clientHeight = document.body.clientHeight;

            if (width > 2000 && height > 2000) {
                if (width > height) {
                    docImg2.css("width", "2000px");
                } else {
                    docImg2.css("height", "2000px");
                }
            }
            else if (width > 2000) {
                docImg2.css("width", "2000px");
            } else if (height > 2000) {
                docImg2.css("height", "2000px");
            }

            gWidth = docImg2.prop("width");
            gHeight = docImg2.prop("height");

            if (((clientHeight * .65) / height) > 0.25) {
                imgWrapper2.css("zoom", ((clientHeight * .65) / height));
            } else {
                imgWrapper2.css("zoom", "0.25");
            }
        });
    }

    docImg1.attr("src", uri);
    docImg1.on("load", function () {
        var width = docImg1.prop("naturalWidth");
        var height = docImg1.prop("naturalHeight");
        var clientHeight = document.body.clientHeight;

        if (width > 2000 && height > 2000) {
            if (width > height) {
                docImg1.css("width", "2000px");
            } else {
                docImg1.css("height", "2000px");
            }
        }
        else if (width > 2000) {
            docImg1.css("width", "2000px");
        } else if (height > 2000) {
            docImg1.css("height", "2000px");
        }

        gWidth = docImg1.prop("width");
        gHeight = docImg1.prop("height");

        if (debug) {
            if (((clientHeight * .65) / height) > 0.25) {
                imgWrapper1.css("zoom", ((clientHeight * .65) / height));
            } else {
                imgWrapper1.css("zoom", "0.25");
            }
        } else {
            if (((clientHeight * .8) / height) > 0.25) {
                imgWrapper1.css("zoom", ((clientHeight * .8) / height));
            } else {
                imgWrapper1.css("zoom", "0.25");
            }
        }

        var words = [];
        if (resultItem.layoutText && resultItem.layoutText.length > 0) {
            words = resultItem.layoutText[pageNum - 1].words;
        }
        var words_in_line_counter = 0;
        var queryWords = query.split(/\s+/);
        var jpnRegex = /([\u3000-\u303f]|[\u3040-\u309f]|[\u30a0-\u30ff]|[\uff00-\uff9f]|[\u4e00-\u9faf]|[\u3400-\u4dbf])+/;
        if (query.match(jpnRegex)) {
            //split into single characters
            queryWords = query.split("");
        }

        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            var boxProperties = getBoxProperties(word.boundingBox);
            var zoom;
            if (debug) {
                if (((clientHeight * .65) / height) > 0.25) {
                    zoom = (clientHeight * .65) / height;
                } else {
                    zoom = 0.25;
                }
            } else {
                if (((clientHeight * .8) / height) > 0.25) {
                    zoom = (clientHeight * .8) / height;
                } else {
                    zoom = 0.25;
                }
            }

            var box = $(".box.tmp").clone().css("display", "block").attr("class", "box act").attr("id", "word_" + i).css("left", boxProperties.left)
                .css("top", boxProperties.top).css("width", boxProperties.width).css("height", boxProperties.height);
            if (queryWords.includes(word.text)) {
                $(box).css("background-color", "rgba(255,255,0,0.5)").css("border", "1px solid yellow");
            } else {
                $(box).css("background-color", "transparent").css("border", "none");
            }

            if (debug) {
                $("#image_wrapper2").append(box);
            } else {
                $("#image_wrapper").append(box);
            }

            var textbox = $(".textbox.tmp").clone().css("display", "block").attr("class", "box").attr("id", "txt_word_" + i).html(word.text);
            if (queryWords.includes(word.text)) {
                $(textbox).css("background-color", "rgba(255,255,0,0.5)").css("border", "1px solid yellow");
            } else {
                $(textbox).css("background-color", "transparent").css("border", "none");
            }

            $("#text_wrapper").append(textbox);
            words_in_line_counter += 1;
            if (words_in_line_counter == 10) {
                var html_text = $("#text_wrapper").html();
                $("#text_wrapper").html(html_text + "<br/>");
                words_in_line_counter = 0;
            }
        }
        docImg1.off("load");
        var lines_to_highlight = sur_lines_pages[pageNum - 1];
        //debug code, for showing all lines of text        
        //lines_to_highlight = lines_pages[pageNum-1]; //uncomment this line to show all text
        highlightLines(lines_to_highlight, debug);
    });
}

function getBoxProperties(boundingBox) {
    var xarray = [];
    var yarray = [];
    for (var i = 0; i < boundingBox.length; i++) {
        xarray.push(boundingBox[i].x);
        yarray.push(boundingBox[i].y);
    }
    var left = Math.min(...xarray);
    var top = Math.min(...yarray);
    var right = Math.max(...xarray);
    var bottom = Math.max(...yarray);
    var width = right - left;
    var height = bottom - top;
    return { "left": left, "right": right, "top": top, "bottom": bottom, "width": width, "height": height };
}

function extract_entities_surgeries(resultItem) {
    s_pages = [];//use as global variable
    sur_lines_pages = [];//use as global variable
    s_pages_items = [];//use as global variable
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    lines_pages = [];// for showing all lines of text
    for (var i = 0; i < resultItem.layoutText.length; i++) {
        var lines = resultItem.layoutText[i].lines;
        var s_line = lines.filter(x => x.text.match(/^手術$/) || x.text.match(/^手術料$/) || x.text.match(/^手術ト.*$/));
        var t_line = [];
        if (s_line.length > 0) {
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => { //use filter() to get the boundingboxes (x) that are below 手術(s_line[0]) and in the same column (between leftLimit and rightLimit)
                var leftLimit = x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;
                return (left > leftLimit && left < rightLimit && top > topMinimum);
            }).reduce((prev, x) => { //use reduce() to get the topmost boundingbox (x), which is the boundingbox immediately below 手術(s_line[0]) and in the same column
                if (prev.length == 0) {
                    var arr = [];
                    arr.push(x);
                    return arr;
                } else {
                    var prevTop = getBoxProperties(prev[0].boundingBox).top;
                    var xTop = getBoxProperties(x.boundingBox).top;
                    if (prevTop < xTop) {
                        return prev;
                    } else {
                        var arr = [];
                        arr.push(x);
                        return arr;
                    }
                }
            }, []);
            if (t_line.length > 0) {
                var leftLimit = x1 + 30;
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
                sur_lines_pages.push(sur_lines);
                var sorted_sur_lines = sur_lines.sort((a, b) => {
                    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
                });
                sorted_sur_text = sorted_sur_lines.map(x => x.text);
                s_pages.push(sorted_sur_text.map((x, idx) => `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
                    + `<div class="col-lg-5 p-0">`
                    + `<span class="orig_text">${x}</span>`
                    + `</div>`
                    + `<div class="col-lg-4 p-0">`
                    + `<span class="corrected_text ml-2"></span>`
                    + `</div>`
                    + `<div class="col-lg-2 p-0">`
                    + `<span class="code_text ml-2"></span>`
                    + `<br/>`
                    + `<span class="kcode_text ml-2"></span>`
                    + `</div>`
                    + `<div class="col-lg-1 p-0">`
                    + `<i id="sur_icon_${idx}" class="fa fa-search sur_edit pl-1 ml-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-hidden="true" style="display:none"></i>`
                    + `<div class="dropdown-menu" aria-labelledby="sur_icon_${idx}"> </div>`
                    + `</div>`
                    + `</div>`).join(""));
            } else {
                s_pages.push("無し");
                sur_lines_pages.push([]);
            }

        } else {
            s_pages.push("無し");
            sur_lines_pages.push([]);
        }
        // for showing all lines of text with the display toggle button
        lines_pages.push(lines);
    }
}

function extract_entities_dpc(resultItem) {
    s_pages = [];//use as global variable
    sur_lines_pages = [];//use as global variable    
    s_pages_items = [];//use as global variable
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    lines_pages = [];// for showing all lines of text
    date_text = "";
    med_spec_text = "";
    for (var i = 0; i < resultItem.layoutText.length; i++) {//iterate per page of document (1 layoutText -> 1 page)
        var lines = resultItem.layoutText[i].lines;

        //update: M.Seras (2020/02/03) - Updated date extraction
        // extract date start
        var kubun_match = false;

        var column_label_line = lines.filter(x => x.text.match(/区分|項目名|単価点数|回数|合計❘金額/));

        var date_label_line = lines.filter(x => x.text.match(/(((\d{4})?\s*\/\s*\d{2}\/\s*\d{2})\s*(~|-|～|－|ー)\s*((\d{4}\s*\/)?(\s*\d{2}\/)?\s*\d{2}))|(((平成|令和)?\s*\d{1,2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(~|-|～|－|ー)\s*((平成|令和)?\s*\d{1,2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日))|((\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(~|-|～|－|ー)\s*(\d{1,2}\s*月\s*\d{1,2}\s*日))/));
        if (date_label_line.length > 0) {
            var date_label_text = date_label_line[0].text;
            // check if date text is already included in the date_label line/bounding box
            var date_match = date_label_text.match(/(((\d{4})?\s*\/\s*\d{2}\/\s*\d{2})\s*(~|-|～|－|ー)\s*((\d{4}\s*\/)?(\s*\d{2}\/)?\s*\d{2}))|(((平成|令和)?\s*\d{1,2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(~|-|～|－|ー)\s*((平成|令和)?\s*\d{1,2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日))|((\d{1,2}\s*月\s*\d{1,2}\s*日)\s*(~|-|～|－|ー)\s*(\d{1,2}\s*月\s*\d{1,2}\s*日))/);

            if (column_label_line.length > 0) {
                if (parseInt(column_label_line[0].boundingBox[0].y) > parseInt(date_label_line[0].boundingBox[2].y)) {
                    if (date_match) {
                        date_text = '<br/><div><span>受診期間：'
                            + date_match[0]
                            + '</span></div>';
                    } else {
                        // get the bounding box to the right of date_label_line
                        var boxProps = getBoxProperties(date_label_line[0].boundingBox);
                        var leftLimit = boxProps.left + boxProps.width;
                        var topMinimum = boxProps.top - 10;
                        // TODO: filter lines using leftLimit, topMinimum
                    }
                }
            }
        };
        // extract date end

        //updated: M.Seras (2020/02/04) - Updated medical specialty extraction     
        // extract medical specialty start
        var med_spec_label_line = null;
        for (var i = 0; i < illness.length; i++) {
            var regex = new RegExp(illness[i]);
            med_spec_label_line = lines.filter(x => x.text.match(regex));

            if (med_spec_label_line.length > 0) {
                var med_spec_label_text = med_spec_label_line[0].text;
                console.log(med_spec_label_text);
                // check if medical specialty text is already included in the med_spec_label line/bounding box
                var med_spec_match = med_spec_label_text.match(regex)

                if (column_label_line.length > 0) {
                    if (parseInt(column_label_line[0].boundingBox[0].y) > parseInt(date_label_line[0].boundingBox[2].y)) {
                        if (med_spec_match) {
                            med_spec_text = '<br/><div><span>診療科：'
                                + med_spec_match[0]
                                + '</span></div>';
                        } else {
                            // get the bounding box to the right of date_label_line
                            var boxProps = getBoxProperties(med_spec_label_line[0].boundingBox);
                            var leftLimit = boxProps.left + boxProps.width;
                            var topMinimum = boxProps.top - 10;
                            // TODO: filter lines using leftLimit, topMinimum
                        }
                    }
                }
            }
        }
        // extract medical specialty end

        // extract dpc entries start
        var s_line = lines.filter(x => x.text.match(/^DPC$/) || x.text.match(/^.*DPC$/) || x.text.match(/^DPC.*$/) || x.text.match(/^包括$/) || x.text.match(/^.*包括$/) || x.text.match(/^包括.*$/));
        var t_line = [];
        if (s_line.length > 0) {
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => {//use filter() to get the boundingboxes (x) that are below DPC(s_line[0]) and in the same column (between leftLimit and rightLimit)
                var leftLimit = x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;
                if (x.text.match(/^DPC$/) || x.text.match(/^.*DPC$/) || x.text.match(/^DPC.*$/)) {
                    return false;
                } else {
                    return (left > leftLimit && left < rightLimit && top > topMinimum);
                }
            }).reduce((prev, x) => {//use reduce() to get the topmost boundingbox (x with smallest value of .top)
                if (prev.length == 0) {
                    var arr = [];
                    arr.push(x);
                    return arr;
                } else {
                    var prevTop = getBoxProperties(prev[0].boundingBox).top;
                    var xTop = getBoxProperties(x.boundingBox).top;
                    if (prevTop < xTop) {
                        return prev;
                    } else {
                        var arr = [];
                        arr.push(x);
                        return arr;
                    }
                }
            }, []);
            if (t_line.length > 0) {
                var leftLimit = x1 + 30;
                //var rightLimit = x1 + boxProps.width;
                var topMinimum = y1;
                var t_lineBoxProps = getBoxProperties(t_line[0].boundingBox);
                var topMaximum = t_lineBoxProps.top - 5;
                var dpc_lines = [];
                dpc_lines = lines.filter(x => {
                    var left = getBoxProperties(x.boundingBox).left;
                    var top = getBoxProperties(x.boundingBox).top;
                    return (left > leftLimit && top > topMinimum && top < topMaximum);
                });
                sur_lines_pages.push(dpc_lines);
                var dpc_lines_rows = getDpcEntriesFromOcrLines(dpc_lines);
                sorted_dpc_text = dpc_lines_rows.map(x => x.map(y => y.text));

                //added: P. Chua (2020/01/30) - Clean result values
                for (var x = 0; x < sorted_dpc_text.length; x++) {
                    var dpcRowValues = sorted_dpc_text[x];
                    var dpcRowTemp = [];

                    for (var y = 0; y < dpcRowValues.length; y++) {
                        var dpcRowValue = dpcRowValues[y];
                        if (dpcRowValue.includes(':')) {
                            dpcRowValue = dpcRowValue.replace(':', '');
                        }

                        dpcRowValue = dpcRowValue.trimStart();

                        if (dpcRowValue.match(/((\*|＊)?(DPC)?((\(|（)[0-9]+.*(\)|）)|入.*([1-4]|(III|IV|II|I|Ⅰ|Ⅱ|Ⅲ|Ⅳ))(.*下)?))|((\*|＊)(DPC).*点)/)) {
                            var dpcRowValueChar1 = dpcRowValue.substring(0, 1);
                            if (dpcRowValueChar1 == '*' || dpcRowValueChar1 == '＊' || dpcRowValueChar1 == '入') {
                                var dpcRowValueChar2 = dpcRowValue.substring(1, 2);
                                var dpcRowValueSplit = dpcRowValue.split('');
                                //correction of 'ー' or '1' mistaken values
                                if (dpcRowValueChar2 == 'ー') {
                                    dpcRowValueSplit[1] = "I";
                                    dpcRowValue = dpcRowValueSplit.join("");
                                } else if (dpcRowValueChar2 == '1') {
                                    dpcRowValueSplit[1] = "I";
                                    dpcRowValue = dpcRowValueSplit.join("");
                                } else if (dpcRowValue.includes('ー')) {
                                    dpcRowValue = dpcRowValue.replace('ー', 'I');
                                } else if (dpcRowValue.includes('一')) {
                                    dpcRowValue = dpcRowValue.replace('一', 'I');
                                }

                                //convert I,II,III,IV to unicode character
                                if (dpcRowValue.includes('IV')) {
                                    dpcRowValue = dpcRowValue.replace('IV', 'Ⅳ');
                                } else if (dpcRowValue.includes('III')) {
                                    dpcRowValue = dpcRowValue.replace('III', 'Ⅲ');
                                } else if (dpcRowValue.includes('II')) {
                                    dpcRowValue = dpcRowValue.replace('II', 'Ⅱ');
                                } else if (dpcRowValue.includes('I')) {
                                    dpcRowValue = dpcRowValue.replace('I', 'Ⅰ');
                                }

                                //update array list
                                if (dpcRowValue.includes('日') && dpcRowValue.match(/.*\d.*/)) {
                                    dpcRowValueSplit = dpcRowValue.slice(2, dpcRowValue.length);
                                    if (dpcRowValues.length > 1) {
                                        dpcRowValues.splice(1, 0, dpcRowValueSplit);
                                    } else {
                                        dpcRowValues.push(dpcRowValueSplit);
                                    }
                                    dpcRowValue = dpcRowValue.slice(0, 2);
                                }
                            }
                        } else if (dpcRowValue.includes('x')) {
                            //separate 'x' value from　点数 value
                            var dpcRowValueSplit = dpcRowValue.split('x');
                            dpcRowValue = dpcRowValueSplit[0];
                            dpcRowValues[y + 1] = dpcRowValueSplit[1] + " " + dpcRowValues[y + 1];
                        } else if (dpcRowValue.includes('X')) {
                            //separate 'X' value from　点数 value
                            var dpcRowValueSplit = dpcRowValue.split('X');
                            dpcRowValue = dpcRowValueSplit[0];
                            dpcRowValues[y + 1] = dpcRowValueSplit[1] + " " + dpcRowValues[y + 1];
                        } else if (dpcRowValue.match(/.*\d.*/)) {
                            //adjust '.' or ',' values in 点数、回数、合計 values
                            if (dpcRowValue.includes('.') && !dpcRowValue.includes('=')) {
                                dpcRowValue = dpcRowValue.replace('.', ',');
                            }

                            if (dpcRowValue.includes('.') && dpcRowValue.includes('=')) {
                                dpcRowValue = dpcRowValue.replace('=', '');
                            }

                            if (dpcRowValue.includes(' ')) {
                                dpcRowValue = dpcRowValue.replace(' ', '.');
                            }
                        }

                        dpcRowValues[y] = dpcRowValue;
                    }

                    //adjust array by data row placement
                    if (dpcRowValues.length >= 5) {
                        if (dpcRowValues[1].includes('日')) {
                            var newDpcRowValue = [];
                            newDpcRowValue.push(dpcRowValues[2], dpcRowValues[3], dpcRowValues[4]);
                            sorted_dpc_text.push(newDpcRowValue);
                            dpcRowValues.pop();
                            dpcRowValues.pop();
                            dpcRowValues.pop();
                        }
                    }

                    //create dictionary to sort array
                    var dpcRowDict = {
                        koumokumei: "",
                        tensu: "",
                        kaisu: "",
                        goukei: ""
                    };
                    for (var y = 0; y < dpcRowValues.length; y++) {
                        if (dpcRowValues[y].match(/((\*|＊)?(DPC)?((\(|（)[0-9]+.*(\)|）)|入.*([1-4]|(III|IV|II|I|Ⅰ|Ⅱ|Ⅲ|Ⅳ))(.*下)?))|((\*|＊)(DPC).*点)/)) {
                            dpcRowDict.koumokumei = dpcRowValues[y];
                        } else if (dpcRowValues[y].match(/\d((\.\d)|日|\=)/g)) {
                            // else if (dpcRowValues[y].length < 4 || dpcRowValues[y].includes('.') || dpcRowValues[y].includes('日')){
                            // dpcRowValues[y] = dpcRowValues[y].replace(/\d((\.\d)|日)/g, '');
                            dpcRowDict.kaisu = dpcRowValues[y];
                        } else if (dpcRowValues[y].length >= 4 && !dpcRowValues[y].includes('.')) {
                            if (dpcRowValues[y].includes(',')) {
                                dpcRowValues[y] = dpcRowValues[y].replace(',', '');
                            }

                            dpcRowValues[y] = dpcRowValues[y].replace(/[^0-9]/g, '');

                            if (dpcRowDict.tensu == '') {
                                dpcRowDict.tensu = dpcRowValues[y];
                            } else {
                                dpcRowDict.goukei = dpcRowValues[y];
                            }
                        }
                    }

                    //sort values in array
                    if (dpcRowDict.length != 0) {
                        dpcRowValues = [];

                        //confirm 点数 and 合計 values
                        if (dpcRowDict.tensu != null && dpcRowDict.goukei != null) {
                            if (parseInt(dpcRowDict.tensu) > parseInt(dpcRowDict.goukei)) {
                                var tensuTemp = dpcRowDict.tensu;
                                var goukeiTemp = dpcRowDict.goukei;
                                dpcRowDict.tensu = goukeiTemp;
                                dpcRowDict.goukei = tensuTemp;
                            }
                        }

                        if (dpcRowDict.koumokumei != null) {
                            dpcRowValues.push(dpcRowDict.koumokumei);
                        }

                        if (dpcRowDict.tensu != null) {
                            if (dpcRowDict.tensu == '') {
                                if (dpcRowDict.kaisu != '' && dpcRowDict.goukei != '') {
                                    dpcRowDict.tensu = parseInt(parseInt(dpcRowDict.goukei) / parseFloat(dpcRowDict.kaisu));
                                }
                            }

                            dpcRowValues.push('' + dpcRowDict.tensu);
                        }

                        if (dpcRowDict.kaisu != null) {
                            if (dpcRowDict.kaisu == '') {
                                if (dpcRowDict.tensu != '' && dpcRowDict.goukei != '') {
                                    dpcRowDict.kaisu = parseFloat(parseInt(dpcRowDict.goukei) / parseInt(dpcRowDict.tensu));
                                }
                            }

                            dpcRowValues.push('' + dpcRowDict.kaisu);
                        }

                        if (dpcRowDict.goukei != null) {
                            if (dpcRowDict.goukei == '') {
                                if (dpcRowDict.tensu != '' && dpcRowDict.kaisu != '') {
                                    dpcRowDict.goukei = parseInt(parseInt(dpcRowDict.tensu) * parseFloat(dpcRowDict.kaisu));
                                }
                            }

                            dpcRowValues.push('' + dpcRowDict.goukei);
                        }
                    }

                    sorted_dpc_text[x] = dpcRowValues;
                }

                //updated: P. Chua (2020/02/04) - Updated table form
                var dpc_label_row_text = `<div class="row no-gutters">`
                    + `<div class="col-lg-3 p-0">`
                    + `<span>項目名</span>`
                    + `</div>`
                    + `<div class="col-lg-3 p-0">`
                    + `<span class="ml-2">単価点数</span>`
                    + `</div>`
                    + `<div class="col-lg-3 p-0">`
                    + `<span class="ml-2">回数</span>`
                    + `</div>`
                    + `<div class="col-lg-3 p-0">`
                    + `<span class="ml-2">合計</span>`
                    + `</div>`
                    + `</div>`;
                s_pages.push(dpc_label_row_text
                    + sorted_dpc_text.map((x, idx) => `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
                        + `<div class="col-lg-3 p-0">`
                        + `<span class="ml-2">${x[0]}</span>`
                        + `</div>`
                        + `<div class="col-lg-3 p-0">`
                        + (x[1] ? `<span class="ml-2">${x[1]}</span>` : "")
                        + `</div>`
                        + `<div class="col-lg-3 p-0">`
                        + (x[2] ? `<span class="ml-2">${x[2]}</span>` : "")
                        + `</div>`
                        + `<div class="col-lg-3 p-0">`
                        + (x[3] ? `<span class="ml-2">${x[3]}</span>` : "")
                        + `</div>`
                        + `</div>`).join(""));
            } else {
                s_pages.push("無し");
                sur_lines_pages.push([]);
            }

        } else {
            s_pages.push("無し");
            sur_lines_pages.push([]);
        }
        // extract dpc entries end        

        // for showing all lines of text with the display toggle button
        lines_pages.push(lines);
    }
}

function getDpcEntriesFromOcrLines(lines, ) {
    //sort by vertical position - topmost first
    var sorted_lines = lines.sort((a, b) => {
        return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
    });
    //get dpc entries
    var resultEntries = [];
    var isEntryStarted = false;
    var entry = [];
    for (var i = 0; i < sorted_lines.length; i++) {
        var text = sorted_lines[i].text;
        //updated: P. Chua (2020/01/30) - Updated regular expression for checking 項目名 value
        if (text.match(/((\*|＊)?(DPC)?((\(|（)[0-9]+.*(\)|）)|入.*([1-4]|(III|IV|II|I|Ⅰ|Ⅱ|Ⅲ|Ⅳ))(.*下)?))|((\*|＊)(DPC).*点)/)) {
            if (isEntryStarted) {
                resultEntries.push(entry);
                entry = [];
                entry.push(lines[i]);
            } else {
                isEntryStarted = true;
                entry.push(lines[i]);
            }
        } else {
            //updated: P. Chua (2020/01/30) - Updated regular expression for checking 点数、回数、合計 value
            if (isEntryStarted && text.match(/(^(\d+(?:\,\d+)*(?:\.\d+)?(?=x|X)))|(^(\d+(?:\,\d+)*(?:\.\d+)?))/)) {
                entry.push(lines[i]);
            } else {
                if (entry.length > 0) {
                    resultEntries.push(entry);
                    entry = [];
                }
                isEntryStarted = false;
            }
        }

        if (i == sorted_lines.length - 1) {
            if (entry.length > 0) {
                resultEntries.push(entry);
            }
        }
    }
    return resultEntries;
}

function getWikipediaLinksHtml(array) {
    return array.reduce(function (accumulator, item, index) {
        //add leading comma only after first item
        //also strip double-byte space and single-byte space from item
        if (index == 0) {
            return accumulator + `<a href="${wiki_url + item.replace(/[ 　]/g, "")}" target="_blank" rel="noopener noreferrer">${item}</a>`;
        } else {
            return accumulator + "," + `<a href="${wiki_url + item.replace(/[ 　]/g, "")}" target="_blank" rel="noopener noreferrer">${item}</a>`;
        }
    }, "");
}

/**pdf viewer start */

/**
 * Displays previous page.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    $('#page_num').text(pageNum);
    display_ocr_image(doc_result_item);
    display_entities();

}

/**
 * Displays next page.
 */
function onNextPage() {
    if (pageNum >= numPages) {
        return;
    }
    pageNum++;
    $('#page_num').text(pageNum);
    display_ocr_image(doc_result_item);
    display_entities();

}

/**pdf viewer end */
//updated: P. Chua (2020/02/14) - added debug function
function highlightLines(lines, debug = false) {
    var imgWrapper;
    if (debug) {
        imgWrapper = document.getElementById("image_wrapper2");
    } else {
        imgWrapper = document.getElementById("image_wrapper");
    }

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var boxProperties = getBoxProperties(line.boundingBox);
        var box = $(".box.tmp").clone().css("display", "block").attr("class", "box act").attr("id", "line_" + i).css("left", boxProperties.left)
            .css("top", boxProperties.top).css("width", boxProperties.width).css("height", boxProperties.height);
        $(box).css("background-color", "rgba(0,255,0,0.5)").css("border", "1px solid green");

        if (debug) {
            $("#image_wrapper2").append(box);
        } else {
            $("#image_wrapper").append(box);
        }
    }
}

function resetEditModeDisplay() {
    $('.fa.fa-search.sur_edit').css('display', 'none');
    $('#edit_mode_label').css('visibility', 'hidden');
    $('#analyze_in_progress').css('display', 'none');
    $('#analyze_finished').css('display', 'none');
    $('#file_entities').css('border', 'none');

    // added: M. Seras (2020/02/27) - select option_display_specific by default
    $('#label_display_specific').addClass("active");
    $('#option_display_specific').prop('checked', true);
    $('#label_display_all').removeClass("active");
    $('#option_display_all').prop('checked', false);
    $('#label_display_items').removeClass("active");
    $('#option_display_items').prop('checked', false);
    $('#coordinate_div').addClass("invisible");
    $('#x1').text('');
    $('#y1').text('');
    $('#x2').text('');
    $('#y2').text('');

    // added: M. Seras (2020/03/02) - change display for coordinate div
    $('#coordinates_selection').removeClass('visible');
    $('#coordinates_selection').addClass('d-none');
    $('#coordinates_selection').addClass('invisible');
}

//returns list of closest matching words in json format
// [ {text:"",code:"",kcode:""}, ...]
function getClosestWords(query, callback) {
    $.ajax({
        url: window.location.origin + "/closestwords",
        method: "get",
        contentType: "application/json; charset=utf-8",
        data: {
            "query": query
        },
        success: function (result) {
            //closestwords api returns list of closest matching words in json format
            var responseJson = JSON.parse(result);
            callback(responseJson);
        },
        error: function () {
            callback("error");
        }
    });
}

//returns string: Surgery_Type, Injection_Med, or Irrelevant
function getWordClassification(query, callback) {
    $.ajax({
        url: window.location.origin + "/classifyword",
        method: "get",
        contentType: "application/json; charset=utf-8",
        data: {
            "query": query
        },
        success: function (result) {
            //classifyword api returns string: Surgery_Type, Injection_Med, or Irrelevant
            callback(result);
        },
        error: function () {
            callback("error");
        }
    });
}

// updated: M. Seras (2020/03/12) - add code and kcode to dropdown item
function editModeButtonOnClick() {
    //$('.fa.fa-search.sur_edit').css('display','inline-block');
    $('#edit_mode_label').css('visibility', 'visible');
    $('#analyze_in_progress').css('display', 'inline-block');
    $('#analyze_finished').css('display', 'none');
    $('#file_entities').css('border', 'dotted 1px red');
    var surgery_text_div = $('#file_entities div.sur_drop span.orig_text');
    if (surgery_text_div.length > 0) {
        var in_progress_count = surgery_text_div.length;
        //use .each() here instead of normal for loop so that value of i is retained inside getClosestWords callback( function(result){} )
        $('#file_entities div.sur_drop span.orig_text').each(function (i, item) {
            var query = surgery_text_div[i].innerText;
            getClosestWords(query, function (result) {
                if (result.length > 0) {
                    $(`#sur_${i} span.corrected_text`).text(result[0].text);
                    $(`#sur_${i} span.code_text`).text(result[0].code);
                    if (result[0].kcode) {
                        $(`#sur_${i} span.kcode_text`).text(result[0].kcode);
                    } else {
                        $(`#sur_${i} span.kcode_text`).text("");
                    }
                    var dropdown_menu_div = $(`#sur_${i} div.dropdown-menu`);
                    if (result[0].kcode) {
                        dropdown_menu_div.html(result.map((x) => `<a class="dropdown-item" data-code="${x.code}" data-kcode="${x.kcode}" href="#">${x.text}</a>`).join(""));
                    } else {
                        dropdown_menu_div.html(result.map((x) => `<a class="dropdown-item" data-code="${x.code}" data-kcode="" href="#">${x.text}</a>`).join(""));
                    }                    
                    $('a.dropdown-item').click(editDropdownItemOnClick);
                    $(`#sur_${i} .fa.fa-search.sur_edit`).css('display', 'inline-block');
                } else {
                    $(`#sur_${i} span.corrected_text`).text("");
                    $(`#sur_${i} span.code_text`).text("");
                    $(`#sur_${i} span.kcode_text`).text("");
                    $(`#sur_${i} .fa.fa-search.sur_edit`).css('display', 'none');
                }
                in_progress_count--;
                if (in_progress_count == 0) {
                    $('#analyze_in_progress').css('display', 'none');
                    $('#analyze_finished').css('display', 'inline-block');
                }
            });
        });
    } else {
        $('#analyze_in_progress').css('display', 'none');
        $('#analyze_finished').css('display', 'inline-block');
    }
}

// updated: M. Seras (2020/03/12) - update code and kcode
function editDropdownItemOnClick(event) {
    var dropdownItem = $(event.currentTarget);
    var dropdownMenu = dropdownItem.parent();
    var parentDiv = $(dropdownMenu).parents('div.sur_drop');
    var correctedText = dropdownItem.text();
    var code = dropdownItem[0].dataset.code;
    var kcode = dropdownItem[0].dataset.kcode;
    //search descendants for span with class corrected_text
    $(parentDiv).find('span.corrected_text').text(correctedText);
    $(parentDiv).find('span.code_text').text(code);
    $(parentDiv).find('span.kcode_text').text(kcode);
}

function exportButtonOnClick() {
    var entities_div = $('#file_entities div.sur_drop');
    var entities_list = [];
    entities_div.each(function (i, item) {
        var orig_text = $(item).find('span.orig_text')[0].innerText;
        var corr_text = $(item).find('span.corrected_text')[0].innerText;
        var code = $(item).find('span.code_text')[0].innerText;
        var kcode = $(item).find('span.kcode_text')[0].innerText;
        var list_item = { "orig_text": orig_text, "code": code, "kcode": kcode, "corr_text": corr_text };
        entities_list.push(list_item);
    });
    var docArr = $('h5.modal-title').text().split('.');
    var docname;
    var isItemsChecked = document.getElementById("option_display_items").checked;
    if (isItemsChecked) {
        docname = docArr[0] + "_項目名";
    } else {
        docname = docArr[0];
    }

    $.ajax({
        url: window.location.origin + "/entitiesexport",
        method: "post",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            "list": entities_list,
            "docname": docname
        }),
        success: function (result) {
            $('a#entities_export').attr('href', result);
            $('a#entities_export')[0].click();
        },
        error: function () {
            console.log("error");
        }
    });
}

//added: P. Chua (2020/02/26) - added debug function
function toggleOCRDisplay(event, debug = false) {
    //clear all ocr highlight boxes first
    $(".box.act").remove();
    $('#edit_mode_label').css('visibility', 'hidden');
    $('#coordinate_div').addClass("invisible");

    // for showing all lines of text
    var lines_to_highlight = lines_pages[pageNum - 1];
    if (event.currentTarget.id == "option_display_specific") {
        // for showing only surgeries or dpc lines of text
        lines_to_highlight = sur_lines_pages[pageNum - 1];
        display_entities();
    } else if (event.currentTarget.id == "option_display_items") {
        $('#coordinate_div').removeClass("invisible");
        lines_to_highlight = [];
        display_entities();
    }

    highlightLines(lines_to_highlight, debug);
}

//added: P. Chua (2020/02/14) - added debug function
function debugButtonOnClick() {
    $("#debug_modal").modal();
}

//added: P. Chua (2020/02/14) - added debug function
function displayResultData() {
    var divReference = document.querySelector('#file_entities1');
    var divToCreate = document.createElement('div');
    divToCreate.id = "newdiv";
    divReference.parentNode.appendChild(divToCreate);

    sorted_text = lines.map(x => x.text);
    s_pages.push(sorted_text);

    divToCreate.innerHTML = sorted_text;
}

//added: P. Chua (2020/02/20) - added export function in debug UI
function exportAllButtonOnClick() {
    var entities_list = [];
    for (var i = 0; i < doc_result_item.layoutText[0].lines.length; i++) {
        entities_list.push(doc_result_item.layoutText[0].lines[i].text);
    }
    var docname = $('h6.modal-title').text();
    $.ajax({
        url: window.location.origin + "/entitiesallexport",
        method: "post",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
            "list": entities_list,
            "docname": docname
        }),
        success: function (result) {
            $('a#entities_export').attr('href', result);
            $('a#entities_export')[0].click();
        },
        error: function () {
            console.log("error");
        }
    });
}

//added: P. Chua (2020/02/26) - added extract items function for OCR display
function extract_entities_items(resultItem) {
    items_lines_pages = [];// for showing all items in text
    s_pages_items = [];
    var i_line = [];
    var sorted_item_lines = [];
    var sorted_item_text = [];
    var x1 = $("#x1").text();
    var y1 = $("#y1").text();
    var x2 = $("#x2").text();
    var y2 = $("#y2").text();
    for (var i = 0; i < resultItem.layoutText.length; i++) {
        var lines = resultItem.layoutText[i].lines;
        for (var x = 0; x < lines.length; x++) {
            var left = getBoxProperties(lines[x].boundingBox).left;
            var right = getBoxProperties(lines[x].boundingBox).right;
            var bottom = getBoxProperties(lines[x].boundingBox).bottom;
            var top = getBoxProperties(lines[x].boundingBox).top;
            if (left >= x1 && right <= x2 && top >= y1 && bottom <= y2) {
                i_line.push(lines[x]);
                sorted_item_lines = i_line.sort((a, b) => {
                    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
                });
            }
        }
        sorted_item_text = sorted_item_lines.map(x => x.text);
        s_pages_items.push(sorted_item_text.map((x, idx) => `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
            + `<div class="col-lg-5 p-0">`
            + `<span class="orig_text">${x}</span>`
            + `</div>`
            + `<div class="col-lg-4 p-0">`
            + `<span class="corrected_text ml-2"></span>`
            + `</div>`
            + `<div class="col-lg-2 p-0">`
            + `<span class="code_text ml-2"></span>`
            + `<br/>`
            + `<span class="kcode_text ml-2"></span>`
            + `</div>`
            + `<div class="col-lg-1 p-0">`
            + `<i id="sur_icon_${idx}" class="fa fa-search sur_edit pl-1 ml-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-hidden="true" style="display:none"></i>`
            + `<div class="dropdown-menu" aria-labelledby="sur_icon_${idx}"> </div>`
            + `</div>`
            + `</div>`).join(""));
    }
    items_lines_pages.push(i_line);
}

//added: P. Chua (2020/02/27) - added extract keyword function for OCR display
function extract_entities_keyword(resultItem, keyword) {
    s_pages = [];//use as global variable
    sur_lines_pages = [];//use as global variable    
    s_pages_items = [];//use as global variable
    sorted_sur_text = [];//use as global variable, for use during edit/correction operation
    lines_pages = [];// for showing all lines of text
    for (var i = 0; i < resultItem.layoutText.length; i++) {
        var lines = resultItem.layoutText[i].lines;
        var strRegex = "^" + keyword + "$";
        var regexVal = new RegExp(strRegex);
        var s_line = lines.filter(x => x.text.match(regexVal));
        var t_line = [];
        if (s_line.length > 0) {
            var boxProps = getBoxProperties(s_line[0].boundingBox);
            var x1 = boxProps.left;
            var y1 = boxProps.top - 10;
            t_line = lines.filter(x => { //use filter() to get the boundingboxes (x) that are below 手術(s_line[0]) and in the same column (between leftLimit and rightLimit)
                var leftLimit = x1 - 20;
                var rightLimit = x1 + 30;
                var topMinimum = y1 + boxProps.height;
                var left = getBoxProperties(x.boundingBox).left;
                var top = getBoxProperties(x.boundingBox).top;
                return (left > leftLimit && left < rightLimit && top > topMinimum);
            }).reduce((prev, x) => { //use reduce() to get the topmost boundingbox (x), which is the boundingbox immediately below 手術(s_line[0]) and in the same column
                if (prev.length == 0) {
                    var arr = [];
                    arr.push(x);
                    return arr;
                } else {
                    var prevTop = getBoxProperties(prev[0].boundingBox).top;
                    var xTop = getBoxProperties(x.boundingBox).top;
                    if (prevTop < xTop) {
                        return prev;
                    } else {
                        var arr = [];
                        arr.push(x);
                        return arr;
                    }
                }
            }, []);
            if (t_line.length > 0 || s_line.length > 0) {
                var leftLimit = x1 + 30;
                //var rightLimit = x1 + boxProps.width;
                var topMinimum = y1;
                var t_lineBoxProps;

                if (t_line.length > 0) {
                    t_lineBoxProps = getBoxProperties(t_line[0].boundingBox);
                } else {
                    t_lineBoxProps = {
                        "left": s_line[0].boundingBox[0].x,
                        "right": s_line[0].boundingBox[1].x,
                        "top": s_line[0].boundingBox[0].y + 1500,
                        "bottom": s_line[0].boundingBox[2].y + 1500,
                        "width": s_line[0].boundingBox[1].x - s_line[0].boundingBox[0].x,
                        "height": s_line[0].boundingBox[2].y - s_line[0].boundingBox[0].y
                    }
                }
                var topMaximum = t_lineBoxProps.top - 5;
                var sur_lines = [];
                sur_lines = lines.filter(x => {
                    var left = getBoxProperties(x.boundingBox).left;
                    var top = getBoxProperties(x.boundingBox).top;
                    return (left > leftLimit && top > topMinimum && top < topMaximum);
                }).filter(x => !x.text.match(/^[0-9]+$/));
                sur_lines_pages.push(sur_lines);
                var sorted_sur_lines = sur_lines.sort((a, b) => {
                    return getBoxProperties(a.boundingBox).top - getBoxProperties(b.boundingBox).top;
                });
                sorted_sur_text = sorted_sur_lines.map(x => x.text);
                s_pages.push(sorted_sur_text.map((x, idx) => `<div id="sur_${idx}" class="sur_drop dropright row no-gutters">`
                    + `<div class="col-lg-5 p-0">`
                    + `<span class="orig_text">${x}</span>`
                    + `</div>`
                    + `<div class="col-lg-4 p-0">`
                    + `<span class="corrected_text ml-2"></span>`
                    + `</div>`
                    + `<div class="col-lg-2 p-0">`
                    + `<span class="code_text ml-2"></span>`
                    + `<br/>`
                    + `<span class="kcode_text ml-2"></span>`
                    + `</div>`
                    + `<div class="col-lg-1 p-0">`
                    + `<i id="sur_icon_${idx}" class="fa fa-search sur_edit pl-1 ml-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-hidden="true" style="display:none"></i>`
                    + `<div class="dropdown-menu" aria-labelledby="sur_icon_${idx}"> </div>`
                    + `</div>`
                    + `</div>`).join(""));
            } else {
                s_pages.push("無し");
                sur_lines_pages.push([]);
            }

        } else {
            s_pages.push("無し");
            sur_lines_pages.push([]);
        }
        // for showing all lines of text with the display toggle button
        lines_pages.push(lines);
    }
}

//added: P. Chua (2020/03/03) - added get mouse click coordinate function
function relMouseCoords(event) {
    var wrap = $('#image_wrapper');

    var canvasX = event.offsetX / wrap[0].style.zoom;
    var canvasY = event.offsetY / wrap[0].style.zoom;

    return { x: canvasX, y: canvasY }
}