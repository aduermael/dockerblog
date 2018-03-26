
var reorder_mode = false;

/*
$( document ).ready(function() {
  
});
*/

function nextBlock() {
	var n = 1;
	var id;

	$('#blocks >').each(function(i,obj)
	{
		id = $(obj).attr('id');
		
		if (id != null) {
			var blockID = parseInt(id.substring(5));
			if (!isNaN(blockID)) {
				if (n <= blockID) n = blockID + 1;
			}	
		}
	})

	return n;
}

function PostFiles(path,formData,callback,errorCallback)
{
	var url = 'http://' + location.host + path;
	// console.log('fullpath : '+fullpath);

	$.ajax
	(
		{
			url: url,
			type:"POST",
			data:formData,
			mimeType:"multipart/form-data",
			contentType: false,
			cache: false,
			processData:false,
			success: function(data, textStatus, jqXHR)
			{
				callback(data);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				errorCallback();
			}
		}
	);
}

// ADMIN

var activeEditor = null;
var editingLink = false;
var linkRange = null;

function hideToolBar(editor) {
	if (editor === activeEditor) {
		$("#blockToolBar").hide();
		activeEditor = null;
		editingLink = false;
	}
}

function showToolBar(editor) {
	activeEditor = editor;
	$("#blockToolBar").insertBefore(editor.container);
	$("#blockToolBar").show();
}

// return true only if clicking on text input
function toolBarMouseDownShouldPropagate(event) {
	var propagate = false;

	if ($("#urlField").prop('disabled')) {
		return propagate;
	}

	$("#textTools >").each(function() {
		if ($(this).attr('id') != null && $(this).attr('id') == "urlField") {
			var bounds = $(this).get(0).getBoundingClientRect()
			if (event.clientX >= bounds.x && event.clientX <= bounds.x + bounds.width &&
				event.clientY >= bounds.y && event.clientY <= bounds.y + bounds.height) {
				console.log("HIT !!!!")

				

				propagate = true;
			}
		}
	})
	return propagate;
}



function bold() {
	if (activeEditor == null) return;
	var format = activeEditor.getFormat();
	activeEditor.format('bold', format.bold == null || format.bold == false);
}

function italic() {
	if (activeEditor == null) return;
	var format = activeEditor.getFormat();
	activeEditor.format('italic', format.italic == null || format.italic == false);
}

function underline() {
	if (activeEditor == null) return;
	var format = activeEditor.getFormat();
	activeEditor.format('underline', format.underline == null || format.underline == false);	
}

function enableURLField(val) {
	$("#urlField").prop('disabled', false);
	$("#unlinkBtn").prop('disabled', false);
	
	$("#urlField").fadeTo(0, 1)
	$("#linkIcon").fadeTo(0, 1)
	$("#unlinkBtn").fadeTo(0, 1)

	if (val != null) {
		$("#urlField").val(val)
	}
}

function disableURLField() {
	$("#urlField").prop('disabled', true);
	$("#unlinkBtn").prop('disabled', true);
	
	$("#urlField").fadeTo(0, 0.5)
	$("#linkIcon").fadeTo(0, 0.5)
	$("#unlinkBtn").fadeTo(0, 0.5)

	$("#urlField").val("")
}

function removeLink() {
	$("#urlField").val("")
	activeEditor.format('link', false);
}

function applyLinkReturnKey(e) {
	if (e.keyCode == 13) { // return
		activeEditor.focus()
	}
}

function applyLink() {
	if (linkRange == null) return

	activeEditor.formatText(linkRange.index, linkRange.length, 'link', $("#urlField").val());
	activeEditor.formatText(linkRange.index, linkRange.length, 'background', false);

	editingLink = false
	linkRange = null
	disableURLField()
}

function addTextBlock(sender)
{
	if (editor != null) {
		console.log(editor)
		console.log(editor.root.innerHTML)
		// editor.container.innerHTML = editor.root.innerHTML;
		return 
	}

  	var blockName = "block" + nextBlock();

  	var block = $("<div id=\"" + blockName +"\" class=\"block block_text\"></div>");

	block.appendTo($("#blocks"))

	console.log("block:", block.get(0));

	var editor = new Quill(block.get(0), {
		theme: 'snow',
		"modules": {
			"toolbar": false
  		}
	});

	editor.on('selection-change', function(range, oldRange, source) {

		if (!editingLink) {
			disableURLField()
		}

		if (range) {
			if (editingLink && linkRange != null) {
				// still editing link
				if (range.index == linkRange.index && range.length == linkRange.length) {
				} else { // done editing
					applyLink()
				}
			}
			if (range.length == 0) { // cursor on range.index
			} else { // 1 or more characters selected
				enableURLField(editor.getFormat()['link'])
			}

			showToolBar(editor)

		} else { // Cursor not in the editor

			if ($("#urlField").is(":focus")) {

				if (editingLink == false) {
					// this line will put the focus back on the editor:
					editor.format('background', '#88DDEE')
					linkRange = editor.getSelection()
					
					console.log("set linkRange:", linkRange)
					// now we should go back to url field:
					$("#urlField").focus()
					// needs to be done after focus
					// because input's onblur ends link edition
					editingLink = true;
				}
			} else {
				hideToolBar(editor)	
			}
		}
	});

	editor.focus()
}

// ling ling qi


/*
function addHtmlBlock(sender)
{
  nextBlock++;
  var blockName = "block" + nextBlock;
  $("#content_blocks").append("<div id=\"" + blockName +"\" class=\"block_html sortable\" style=\"margin-bottom: 10px; border-radius: 5px;outline: none;\"><textarea>Text</textarea></div>");
}

function addGalleryBlock(sender)
{
	nextBlock++;
  	var blockName = "block" + nextBlock;
  	$("#content_blocks").append("<div id=\"" + blockName +"\" class=\"block_gallery sortable\" style=\"margin-bottom: 10px; border-radius: 5px;outline: none;\">" +
  		"<textarea></textarea>" +
  		"<a href=\"#\" onclick=\"addImageToGallery('" + blockName + "');return false;\">" +
  		"Add image</a></div>");
}

function addImageToGallery(blockName) {
	console.log("block name:" + blockName)
}

function sendImage(sender)
{
  $("#upload_image_form").submit();
}

function sendFile(sender)
{
  $("#upload_file_form").submit();
}

function addImageBlock(sender)
{
  $('#upload_image_input').click();
}

function addFileBlock(sender)
{
  $('#upload_file_input').click();
}

function addContactForm(sender)
{
	nextBlock++;
	var blockName = "block" + nextBlock;
	
	$("#content_blocks").append("<div id=\"" + blockName +"\" class=\"block_contact sortable\" style=\"margin-bottom: 10px;background-color: #F7F7F7;border-radius: 5px;outline: none;\">" 
		+ "<div>"
			+ "<p style=\"float:left;margin-right:10px;\">To:</p>"
			+ "<input id=\"emailTo\" type=\"text\" style=\"float:left;width:500px;margin:0;height:20px;\">"
			+ "<div style=\"clear:both;\"></div>"
		+ "</div>"		
		+ "<div>"
			+ "<p style=\"float:left;margin-right:10px;\">Title:</p>"
			+ "<input id=\"emailTitle\" type=\"text\" style=\"float:left;width:500px;margin:0;height:20px;\">"
			+ "<div style=\"clear:both;\"></div>"
		+ "</div>"		
	+ "</div>");
}


function editPost(sender)
{
	var postContent = new Object()
	postContent.ID = $('#postID').attr('value');
	var blocks = new Array();
	var i = 0;

	// to link post with a FB post and merge comments
	var fbPostID = $('#fbpostID').val();

	if (fbPostID && fbPostID != "" && fbPostID != "postID") // not empty and not default value
	{
		postContent.fbpostID = $('#fbpostID').val();
	}


	$('#content_blocks').children().each(function ()
	{
		blocks[i] = new Object();

		if ($(this).hasClass("block_text"))
		{
			blocks[i].type = "text";
			blocks[i].text = $(this).html();
		}
		else if ($(this).hasClass("block_file"))
		{
			blocks[i].type = "file";
			blocks[i].url = $(this).html();
			blocks[i].filename = "error"

			var components = blocks[i].url.split("/");
			if (components.length > 0) {
				blocks[i].filename = components[components.length-1]	
			}
		}
		else if ($(this).hasClass("block_html"))
		{
			blocks[i].type = "html";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_gallery"))
		{
			blocks[i].type = "gallery";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_image"))
		{
			blocks[i].type = "image";

			blocks[i].path = $($(this).children('img')[0]).attr( 'src' );

			blocks[i].url = $($(this).children('input')[0]).val();
			if (blocks[i].url == "URL") blocks[i].url = "";

			blocks[i].description = $($(this).children('input')[1]).val();
			if (blocks[i].description == "Description") blocks[i].description = "";
		}
		else if ($(this).hasClass("block_contact"))
		{
			blocks[i].type = "contact";
			blocks[i].to = $($(this).children('div')[0]).children('input')[0].value;
			blocks[i].title = $($(this).children('div')[1]).children('input')[0].value;
		}
		else if ($(this).hasClass("block_video"))
		{
			blocks[i].type = "video";
		}
		else
		{
			blocks[i].type = "unknown type";
		}

		i++;

	});


	postContent.blocks = blocks;
	postContent.postTitle = $("#postTitle").val();

	Post('/admin/edit',postContent,editPostCallBack,errorCallback);
}



function editPage(sender)
{
	var pageContent = new Object()
	pageContent.ID = $('#pageID').attr('value');
	var blocks = new Array();
	var i = 0;

	$('#content_blocks').children().each(function ()
	{
		blocks[i] = new Object();

		if ($(this).hasClass("block_text"))
		{
			blocks[i].type = "text";
			blocks[i].text = $(this).html();
		}
		else if ($(this).hasClass("block_file"))
		{
			blocks[i].type = "file";
			blocks[i].url = $(this).html();
			blocks[i].filename = "error"

			var components = blocks[i].url.split("/");
			if (components.length > 0) {
				blocks[i].filename = components[components.length-1]	
			}
		}
		else if ($(this).hasClass("block_html"))
		{
			blocks[i].type = "html";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_gallery"))
		{
			blocks[i].type = "gallery";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_image"))
		{
			blocks[i].type = "image";
			blocks[i].path = $($(this).children('img')[0]).attr( 'src' );

			blocks[i].url = $($(this).children('input')[0]).val();
			if (blocks[i].url == "URL") blocks[i].url = "";

			blocks[i].description = $($(this).children('input')[1]).val();
			if (blocks[i].description == "Description") blocks[i].description = "";
		}
		else if ($(this).hasClass("block_contact"))
		{
			blocks[i].type = "contact";
			blocks[i].to = $($(this).children('div')[0]).children('input')[0].value;
			blocks[i].title = $($(this).children('div')[1]).children('input')[0].value;
		}
		else if ($(this).hasClass("block_video"))
		{
			blocks[i].type = "video";
		}
		else
		{
			blocks[i].type = "unknown type";
		}

		i++;

	});

	pageContent.blocks = blocks;
	pageContent.pageName = $("#pageName").val();
	pageContent.pageTitle = $("#pageTitle").val();

	Post('/admin/pages/edit',pageContent,editPageCallBack,errorCallback);
}



*/

var editPostCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		document.location = "/admin/posts";
	}
	else
	{
		alert("FAILED");
	}
}

/*

var editPageCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		document.location = "/admin/pages";
	}
	else
	{
		alert("FAILED");
	}
}


*/

function sendPost(sender)
{
	var postContent = new Object()
	var blocks = new Array();
	var i = 0;

	// to link post with a FB post and merge comments
	var fbPostID = $('#fbpostID').val();

	if (fbPostID && fbPostID != "" && fbPostID != "postID") // not empty and not default value
	{
		postContent.fbpostID = $('#fbpostID').val();
	}

	$('#blocks').children().each(function ()
	{
		blocks[i] = new Object();
		//postContent[i].id = this.id;

		if ($(this).hasClass("block_text"))
		{
			blocks[i].type = "text";
			blocks[i].text = $(this).html();
		}
		else if ($(this).hasClass("block_file"))
		{
			blocks[i].type = "file";
			blocks[i].url = $(this).html();
			blocks[i].filename = "error"

			var components = blocks[i].url.split("/");
			if (components.length > 0) {
				blocks[i].filename = components[components.length-1]	
			}
		}
		else if ($(this).hasClass("block_html"))
		{
			blocks[i].type = "html";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_gallery"))
		{
			blocks[i].type = "gallery";
			blocks[i].data = $(this).children('textarea')[0].value;
		}
		else if ($(this).hasClass("block_image"))
		{
			blocks[i].type = "image";
			blocks[i].path = $($(this).children('img')[0]).attr( 'src' );

			blocks[i].url = $($(this).children('input')[0]).val();
			if (blocks[i].url == "URL") blocks[i].url = "";

			blocks[i].description = $($(this).children('input')[1]).val();
			if (blocks[i].description == "Description") blocks[i].description = "";
		}
		else if ($(this).hasClass("block_contact"))
		{
			blocks[i].type = "contact";
			blocks[i].to = $($(this).children('div')[0]).children('input')[0].value;
			blocks[i].title = $($(this).children('div')[1]).children('input')[0].value;
		}
		else if ($(this).hasClass("block_video"))
		{
			blocks[i].type = "video";
		}
		else
		{
			blocks[i].type = "unknown type";
		}

		i++;

	});

	postContent.blocks = blocks;
	postContent.postTitle = $("#postTitle").val();

	Post('/admin/new',postContent,editPostCallBack,errorCallback);
}

/*


function sendPage(sender)
{
  var postContent = new Object();
  var blocks = new Array();
  var i = 0;

  $('#content_blocks').children().each(function ()
  {
    blocks[i] = new Object();
    //postContent[i].id = this.id;

    if ($(this).hasClass("block_text"))
    {
      blocks[i].type = "text";
      blocks[i].text = $(this).html();

    }
    else if ($(this).hasClass("block_file"))
	{
		blocks[i].type = "file";
		blocks[i].url = $(this).html();
		blocks[i].filename = "error"

		var components = blocks[i].url.split("/");
		if (components.length > 0) {
			blocks[i].filename = components[components.length-1]	
		}
	}
    else if ($(this).hasClass("block_html"))
	{
		blocks[i].type = "html";
		blocks[i].data = $(this).children('textarea')[0].value;
	}
	else if ($(this).hasClass("block_gallery"))
	{
		blocks[i].type = "gallery";
		blocks[i].data = $(this).children('textarea')[0].value;
	}
    else if ($(this).hasClass("block_image"))
    {
      blocks[i].type = "image";
      blocks[i].path = $($(this).children('img')[0]).attr( 'src' );
      
      blocks[i].url = $($(this).children('input')[0]).val();
      if (blocks[i].url == "URL") blocks[i].url = "";

      blocks[i].description = $($(this).children('input')[1]).val();
      if (blocks[i].description == "Description") blocks[i].description = "";

    }
    else if ($(this).hasClass("block_contact"))
    {
      blocks[i].type = "contact";
      blocks[i].to = $($(this).children('div')[0]).children('input')[0].value;
      blocks[i].title = $($(this).children('div')[1]).children('input')[0].value;
    }
    else if ($(this).hasClass("block_video"))
    {
      blocks[i].type = "video";
    }
    else
    {
      blocks[i].type = "unknown type";
    }

    i++;

  });

  postContent.blocks = blocks;
  postContent.pageName = $("#pageName").val();
  postContent.pageTitle = $("#pageTitle").val();

  Post('/admin/pages/new',postContent,editPageCallBack,errorCallback);
}





// COMMENTS

function acceptComment(comID)
{
	var obj = {};
	obj.ID = comID;

	Post('/admin/acceptComment',obj,acceptCommentCallBack,errorCallback);
}

function deleteComment(comID)
{
	var obj = {};
	obj.ID = comID;

	var r = confirm("Are you sure?");
	
	if (r == true) 
	{
		Post('/admin/deleteComment',obj,deleteCommentCallBack,errorCallback);
	} 
	else
	{
		// do nothing
	}
}

function highlightComment(comID)
{
	var obj = {};
	obj.ID = comID;

	Post('/admin/highlightComment',obj,highlightCommentCallBack,errorCallback);
}


function unhighlightComment(comID)
{
	var obj = {};
	obj.ID = comID;

	Post('/admin/unhighlightComment',obj,unhighlightCommentCallBack,errorCallback);
}



var acceptCommentCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		if (res.comID)
		{
			$("#com" + res.comID).stop().css("background-color", "#a0d651").animate({ backgroundColor: "#F7F7F7"}, 500);
			$("#accept" + res.comID).remove();
		}
		else
		{
			document.location = "/admin/comments";
		}
	}
	else
	{
		alert("FAILED");
	}
}



var deleteCommentCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		if (res.comID)
		{
			$("#com" + res.comID).remove();
		}
		else
		{
			document.location = "/admin/comments";
		}
	}
	else
	{
		alert("FAILED");
	}
}



var highlightCommentCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		if (res.comID)
		{
			$("#com" + res.comID).animate({ backgroundColor: "#ffe168"}, 500);

			$("#highlight" + res.comID).empty();

			$("#highlight" + res.comID).append(" - <a href=\"#\" onclick=\"unhighlightComment(" + res.comID + ");return false;\" style=\"color:#ef8700\">Unhighlight</a>")
		}
		else
		{
			document.location = "/admin/comments";
		}
	}
	else
	{
		alert("FAILED");
	}
}


var unhighlightCommentCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		if (res.comID)
		{
			$("#com" + res.comID).animate({ backgroundColor: "#F7F7F7"}, 500);

			$("#highlight" + res.comID).empty();

			$("#highlight" + res.comID).append(" - <a href=\"#\" onclick=\"highlightComment(" + res.comID + ");return false;\" style=\"color:#ef8700\">Highlight</a>")
		}
		else
		{
			document.location = "/admin/comments";
		}
	}
	else
	{
		alert("FAILED");
	}
}




// POSTS

function deletePost(postID)
{
	var obj = {};
	obj.ID = postID;

	var r = confirm("Are you sure?");
	
	if (r == true) 
	{
		Post('/admin/deletePost',obj,deletePostCallBack,errorCallback);
	} 
	else
	{
		// do nothing
	}
	
	
}


var deletePostCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		document.location = "/admin/posts";
	}
	else
	{
		alert("FAILED");
	}
}



// PAGES

function deletePage(pageID)
{
	var obj = {};
	obj.ID = pageID;

	var r = confirm("Are you sure?");
	
	if (r == true) 
	{
		Post('/admin/deletePage',obj,deletePageCallBack,errorCallback);
	} 
	else
	{
		// do nothing
	}
}


var deletePageCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		document.location = "/admin/pages";
	}
	else
	{
		alert("FAILED");
	}
}






// KEYS

function keysAddKey(sender)
{
	var postContent = new Object()
	postContent.key = $('#addKey').val();
	postContent.value = $('#addValue').val();
	Post('/admin/keys/key', postContent, keysAddKeyCallBack, errorCallback);
	//postContent.lang = $('#langSelector option:selected').val();
	//alert(JSON.stringify(postContent));
}



function keysAddKeyCallBack(response)
{
	// console.log('RESULT : '+JSON.stringify(data));
	if(response.success && response.success == true)
	{
		document.location = "/admin/keys";
	}
	else
	{
		alert("FAILED");
	}
}


function keysDeleteKey(sender)
{
	var key = $(sender).closest('li').find('div:first-child strong').html();

	var postContent = new Object()
	postContent.key = key
	Post('/admin/keys/delete_key', postContent, callback_key_delete, errorCallback);
	//postContent.lang = $('#langSelector option:selected').val();
	//alert(JSON.stringify(postContent));
}



function callback_key_delete(response)
{
	if(response.success && response.success == true)
	{
		document.location = "/admin/keys";
	}
	else
	{
		alert("FAILED");
	}
}



// CONFIG

function updateEmailCredentials()
{	
	var obj = {};
	obj.user = $("#emailUser").val();
	obj.clientID = $("#emailClientID").val();
	obj.clientSecret = $("#emailClientSecret").val();
	obj.refreshToken = $("#emailRefreshToken").val();
	
	Post('/admin/emailcredentials', obj, callbackUpdateEmailCredentials, errorCallback);
}


function callbackUpdateEmailCredentials(response)
{
	if(response.success)
	{
		document.location = "/admin/config";
	}
	else
	{
		alert("FAILED");
	}
}




function updateFBConfig()
{	
	var obj = {};
	obj.clientID = $("#fbClientID").val();
	obj.clientSecret = $("#fbClientSecret").val();
	
	Post('/admin/config/fbconfig', obj, callbackUpdateFBConfig, errorCallback);
}


function callbackUpdateFBConfig(response)
{
	if(response.success)
	{
		document.location = "/admin/config";
	}
	else
	{
		alert("FAILED");
	}
}




function updateCredentials()
{	
	var obj = {};
	obj.login = $("#login").val();
	obj.loginVerif = $("#loginVerif").val();
	obj.pass = $("#pass").val();
	obj.passVerif = $("#passVerif").val();
	
	Post('/admin/credentials', obj, callbackUpdateCredentials, errorCallback);
}


function callbackUpdateCredentials(response)
{
  if(response.success)
  {
	document.location = "/admin/config";
  }
  else
  {
    alert("FAILED");
  }
}




function configUpdateKey(sender)
{
    var key = $(sender).closest('li').find('div:first-child strong').html();
    var value = $(sender).closest('li').find('div textarea').val();
    // console.log('--> '+key+' / '+value);
    var postContent = new Object()
    postContent.key = key;
    postContent.value = value;
    Post('/admin/config/key', postContent, callback_config_update, errorCallback);
}



function callback_config_update(response)
{
  if(response.success)
  {
    alert('SUCCESS');
  }
  else
  {
    alert("FAILED");
  }
}



function reorder(sender)
{
	if (!reorder_mode)
    {
      $( "#content_blocks" ).sortable(
      {
        items: '.sortable',
        cursorAt: { top: 25 , left: 25 },
        start: function(event,ui)
        {
           ui.item.width(50.0);
           ui.item.height(50.0);
           ui.item.css("overflow","hidden");
        }
      });

      $('#trash').css("display","block");

      $( "#trash" ).droppable(
      {
        drop: function( event, ui )
        {
          ui.draggable.remove();
          $('#trash').css("background-color","#fcc");
        },
        out: function( event, ui )
        {
          $('#trash').css("background-color","#fcc");
        },
        over: function( event, ui )
        {
          $('#trash').css("background-color","#f88");
        }
      });

      //$( "#content_blocks" ).sortable();
      //$( "#content_blocks" ).disableSelection();
      $("input").prop('disabled', true);
      $("input").css('opacity', 0.1);
      $(".block_image").css('border','1px dashed #000');
      $(".block_file").css('border','1px dashed #000');
      $(".block_text").css('border','1px dashed #000');
      $(".block_html").css('border','1px dashed #000');
      $(".block_gallery").css('border','1px dashed #000');
	  $(".block_contact").css('border','1px dashed #000');
      
     
      reorder_mode = true;
    }
    else
    {
      $('#trash').css("display","none");


      $('#content_blocks').sortable('destroy');
      //$('#content_blocks').disableSelection('cancel');
      //$('#content_blocks').unbind('click');
      //$('#content_blocks').unbind('mousedown');
      //$('#content_blocks').unbind('mouseup');
      //$('#content_blocks').unbind('selectstart');
      $("input").prop('disabled', false);
      $("input").css('opacity', 1.0);
      $(".block_image").css('border','none');
      $(".block_file").css('border','none');
      $(".block_text").css('border','none');
      $(".block_html").css('border','none');
      $(".block_gallery").css('border','none');
      $(".block_contact").css('border','none');
      
      reorder_mode = false;
    }
}



var langSelectorCallback = function(data)
{
	var res = data;

	if(res.success)
	{
		alert("SUCCESS");
		//document.location = "/admin/posts/" + "en"; // make lang dynamic
	}
	else
	{
		alert("FAILED");
	}
}



$(document).ready(function()
{
	$('#langSelector').change(function(value)
	{
		var selectedLang = $('#langSelector option:selected').val();
		document.location = "/admin/lang/" + selectedLang;
	})

	


	$('#reorderBtn').click(function()
	{
		if (!reorder_mode)
		{
			$( "#content_blocks" ).sortable(
			{
				items: '.sortable',
				cursorAt: { top: 25 , left: 25 },
				start: function(event,ui)
				{
					ui.item.width(50.0);
					ui.item.height(50.0);
					ui.item.css("overflow","hidden");
				}
			});

			$('#trash').css("display","block");

			$( "#trash" ).droppable(
			{
				drop: function( event, ui )
				{
					ui.draggable.remove();
					$('#trash').css("background-color","#fcc");
				},
				out: function( event, ui )
				{
					$('#trash').css("background-color","#fcc");
				},
				over: function( event, ui )
				{
					$('#trash').css("background-color","#f88");
				}
			});

			//$( "#content_blocks" ).sortable();
			//$( "#content_blocks" ).disableSelection();
			$("input").prop('disabled', true);
			$("input").css('opacity', 0.1);
			$(".block_image").css('border','1px dashed #000');
			$(".block_text").css('border','1px dashed #000');
			$(".block_file").css('border','1px dashed #000');
			$(".block_html").css('border','1px dashed #000');
			$(".block_gallery").css('border','1px dashed #000');
			$(".block_contact").css('border','1px dashed #000');

			reorder_mode = true;
		}
		else
		{
			$('#trash').css("display","none");


			$('#content_blocks').sortable('destroy');
			//$('#content_blocks').disableSelection('cancel');
			//$('#content_blocks').unbind('click');
			//$('#content_blocks').unbind('mousedown');
			//$('#content_blocks').unbind('mouseup');
			//$('#content_blocks').unbind('selectstart');
			$("input").prop('disabled', false);
			$("input").css('opacity', 1.0);
			$(".block_image").css('border','none');
			$(".block_text").css('border','none');
			$(".block_file").css('border','none');
			$(".block_html").css('border','none');
			$(".block_gallery").css('border','none');
			$(".block_contact").css('border','none');
			
			reorder_mode = false;
		}
	});
	


	$("form#upload_image_form").submit(function(e)
	{
		e.preventDefault();
		//grab all form data
		var formData = new FormData($(this)[0]);
		var inputs = document.getElementById('upload_image_input');

		if (inputs.files.length > 0)
		{
			PostFiles('/admin/image',formData,uploadImageCallback,errorCallback);
		}
		else
		{
			console.log("nothing to send");
		}
		return false;
	});


	$("form#upload_file_form").submit(function(e)
	{
		e.preventDefault();
		//grab all form data
		var formData = new FormData($(this)[0]);
		var inputs = document.getElementById('upload_file_input');

		if (inputs.files.length > 0)
		{
			PostFiles('/admin/file',formData,uploadFileCallback,errorCallback);
		}
		else
		{
			console.log("nothing to send");
		}
		return false;
	});


});


var uploadImageCallback = function(data)
{	
	var res = JSON.parse(data);
	
	if(res.success)
	{
		nextBlock++;
		var blockName = "block" + nextBlock;
		
		$("#content_blocks").append("<div id=\"" + blockName +"\" class=\"edit_post_zone backgroundLevel_8 block_image sortable\"><img src=\"" + res.file_path + "\"/><input id=\"imageurl\" name=\"imageurl\" type=\"text\" value=\"URL\" style=\"float:left;width:500px;margin:0;margin-top:10px;height:20px;\" onfocus=\"if(this.value == 'URL') { this.value = ''; }\" onblur=\"if(this.value == '') { this.value = 'URL'; }\"/><input id=\"imagedescription\" name=\"imagedescription\" type=\"text\" value=\"Description\" style=\"float:left;width:500px;margin:0;margin-top:10px;height:20px;\" onfocus=\"if(this.value == 'Description') { this.value = ''; }\" onblur=\"if(this.value == '') { this.value = 'Description'; }\"/><div style=\"margin:0;padding:0;clear:both;\"></div></div>");
	}
	else
	{
		alert("FAILED");
	}
}


var uploadFileCallback = function(data)
{	
	var res = JSON.parse(data);
	
	if(res.success)
	{
		nextBlock++;
		var blockName = "block" + nextBlock;
		
		$("#content_blocks").append("<div id=\"" + blockName +"\" class=\"edit_post_zone block_file sortable\">" + res.file_path  + "</div>");
	}
	else
	{
		alert("FAILED");
	}
}

*/
