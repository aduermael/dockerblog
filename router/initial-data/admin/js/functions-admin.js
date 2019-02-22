
var savedBlocksHTML = ""
var savedTitle = ""
var savedFBPostID = ""

$( document ).ready(function() {
    $(".date").each(function(index) {
    	$(this).show()
    	console.log("date", $(this).html())
    	$(this).html(moment(parseInt($(this).html()) * 1000, "x").format('- MM-DD-YYYY h:mm a (dddd)'))
    })
    initExistingBlocks()
});

var errCallback = function(data) {
	if (data) {
		alert(data.message)
		return
	}
	alert("error")
}

function isDirty() {
	var a = $('#blocks').html() != savedBlocksHTML
	var b = $('#postTitle').val() != savedTitle
	var c = $('#fbpostID').val() != savedFBPostID
	return (a || b || c)
}

function alertIfDirty() {
	if (isDirty()) {
		return "Are you sure you want to leave this page?"
	}
	return null
}

function notDirty() {
	savedBlocksHTML = $('#blocks').html()
	savedTitle = $("#postTitle").val()
	savedFBPostID = $('#fbpostID').val()
}

function popupLoading() {
	var popup = $('<div class="confirmation-popup-parent"><div id="confirmation-popup" class="confirmation-popup"><span class="fas fa-cog fa-spin"></span></div></div>')
	$('body').prepend(popup);

	popup.hide()
	popup.fadeIn(100)

    return popup
}

function popupDone(popup) {
	$("#confirmation-popup").html('<span class="fa fa-check-circle" aria-hidden="true"></span>')

	popup.delay(100).fadeOut(1000, function() {
		popup.remove()
	})
}

function popupError(popup) {
	$("#confirmation-popup").html('<span class="fa fa-times" aria-hidden="true"></span>')

	popup.delay(100).fadeOut(1000, function() {
		popup.remove()
	})		
}

function nextBlock() {
	var n = 0;
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

// LOGIN

function login() {
	$("#login-error").hide()

	var request = new Object()
	request.username = $("#username").val()
	request.password = $("#password").val()

	Post('/admin-login',request,function(response) {
		location.reload()
	}, function(errorResponse){
		if (errorResponse.message) {
			$("#login-error").text(errorResponse.message)
		} else {
			$("#login-error").text("error")
		}
		$("#login-error").show()
	})
}

function logout() {
	var request = new Object()

	var popup = popupLoading()

	Post('/admin/logout',request,function(response) {
		location.reload()
	}, function(errorResponse){
		popup.remove()
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	})
}

// ADMIN

var activeEditor = null
var editingLink = false
var linkRange = null
// instance that's retaining the toolbar
// only that instance can ask for the toolbar to be hidden
var toolBarRetainer = null

function hideToolBar(retainer) {
	if (toolBarRetainer == null) return

	if (retainer === toolBarRetainer) {
		$("#blockToolBar").hide()
		toolBarRetainer = null

		activeEditor = null
		editingLink = false
	}
}

function showToobarForTextEditor(editor) {
	activeEditor = editor
	toolBarRetainer = editor
	$("#blockToolBar").insertBefore(editor.container)
	$("#blockToolBar").show()
	$("#textTools").show()
}

function showToobarForHtmlEditor(editor) {
	activeEditor = editor
	toolBarRetainer = editor
	$("#blockToolBar").insertBefore(editor.container)
	$("#blockToolBar").show()
	$("#textTools").hide()
}

function showToolBar(sender) {
	$("#textTools").hide()
	// image
	if ($(sender).hasClass("block_image")) {
		$("#blockToolBar").insertBefore(sender)
		$("#blockToolBar").show()
	} else if ($(sender).hasClass("block_html")) {
		$("#blockToolBar").insertBefore(sender)
		$("#blockToolBar").show()
	} else if ($(sender).hasClass("block_gallery")) {
		$("#blockToolBar").insertBefore(sender)
		$("#blockToolBar").show()
	} else {
		return
	}

	toolBarRetainer = sender
	// stop focusing on text editor if active
	if (activeEditor != null) {
		activeEditor.blur()
	}	
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

function initTextBlock(block) {

	// for some reason, when creating the editor, a new line is added.
	// saving block's html content now to re-assign it after initialization.
	var htmlContent = block.html()

	console.log("initTextBlock")
	console.log(htmlContent)

	// htmlContent = htmlContent.replace(/<[\/]*(div|span)[^>]*>/g, '')
	htmlContent = htmlContent.replace(/<div>/g, '<p>')
	htmlContent = htmlContent.replace(/<\/div>/g, '<\/p>')

	htmlContent = htmlContent.replace(/<span>/g, '<p>')
	htmlContent = htmlContent.replace(/<\/span>/g, '<\/p>')

	var editor = new Quill(block.get(0), {
		theme: 'snow',
		"modules": {
			"toolbar": false
  		}
	});

	// re-assigning html content...
	block.children().first().html(htmlContent)

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

			showToobarForTextEditor(editor)

		} else { // Cursor not in the editor

			if ($("#urlField").is(":focus")) {

				if (editingLink == false) {
					// this line will put the focus back on the editor:
					editor.format('background', '#88DDEE')
					linkRange = editor.getSelection()

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

	return editor
}

function addTextBlock(sender) {
  	var blockName = "block" + nextBlock();
  	var block = $("<div id=\"" + blockName +"\" class=\"block block_text\"><p><br></p></div>");
	block.appendTo($("#blocks"))
	var editor = initTextBlock(block)
	editor.focus()
}

function addImageBlock(sender) {
  	$('#imageFile').click();
}

// used to init all blocks when editing a post
function initExistingBlocks() {
	$('#blocks').children().each(function ()
	{
		if ($(this).hasClass("block_text")) { initTextBlock($(this)) } 
	})
}

function moveUp() {
	var toMove = $("#blockToolBar").next()
	var swapWith = $("#blockToolBar").prev()

	if (swapWith != null) {
		toMove.insertBefore(swapWith)
		$("#blockToolBar").insertBefore(toMove)
	}

	if (activeEditor != null) {
		activeEditor.focus()
	}
}

function moveDown() {
	var toMove = $("#blockToolBar").next()
	var swapWith = toMove.next()

	if (swapWith != null) {
		toMove.insertAfter(swapWith)
		$("#blockToolBar").insertBefore(toMove)
	}

	if (activeEditor != null) {
		activeEditor.focus()
	}
}

function removeBlock() {
	if (confirm("Are you sure? 😮")) {
		$("#blockToolBar").next().remove()
		hideToolBar(toolBarRetainer)	
	}
}

function removePost(postID) {
	if (confirm("Are you sure? 😮")) {
		Post('/admin/delete', {ID: parseInt(postID)}, function(response){
			$("#post-"+postID).remove()
		}, function(errorResponse){
			alert("ERROR:", JSON.stringify(errorResponse))
		})
	}
}


var uploadImageCallback = function(data) {
	var res = JSON.parse(data)
	
	if(res.success) {
		var blockName = "block" + nextBlock()
	  	var block = $("<div onclick=\"showToolBar(this)\" id=\"" + blockName +"\" class=\"block block_image\"><img src=\"" + res.filepaths[0] + "\" " + (res.retinapaths.length > 0 ? "srcset=\"" + res.retinapaths[0] + " 2x\"" : "") + "/>" +
	  		"<input placeholder=\"URL\" id=\"" + blockName + "-url\" name=\"" + blockName + "-url\" type=\"text\" onfocus=\"this.placeholder = ''\" onblur=\"this.placeholder = 'URL'\" autocomplete=\"off\"/>" +
	  		"<input placeholder=\"Description\" id=\"" + blockName + "-desc\" name=\"" + blockName + "-desc\" type=\"text\" onfocus=\"this.placeholder = ''\" onblur=\"this.placeholder = 'Description'\" autocomplete=\"off\"/>" +
	  		"</div>")
		block.appendTo($("#blocks"))
		block.click()
	}
	else {
		alert(res.message)
	}
}

var uploadImage = function(form, evt) {
	evt.preventDefault()

	//grab all form data
	var formData = new FormData(form)
	var inputs = document.getElementById('imageFile')

	if (inputs.files.length > 0) {
		PostFiles('/admin/upload',formData,uploadImageCallback,errCallback)
	}
	else {
		console.log("nothing to send")
	}

	return false
}

var sendImage = function(sender) {
	$("#imageUploader").submit()
	$(sender).val("")
}

function addHtmlBlock(sender) {
  	var blockName = "block" + nextBlock();
  	var block = $("<textarea onfocus=\"showToolBar(this)\" id=\"" + blockName +"\" class=\"block block_html\"></textarea>")
	block.appendTo($("#blocks"))
	block.focus()
}

function addGalleryBlock(sender) {
  	var blockName = "block" + nextBlock();
  	var block = $("<div onclick=\"showToolBar(this)\" id=\"" + blockName +"\" class=\"block block_gallery\">Gallery</div>");
	block.appendTo($("#blocks"))
	block.focus()
}

/*
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

function sendFile(sender)
{
  $("#upload_file_form").submit();
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
	hideToolBar(activeEditor)

	var postContent = new Object()
	var blocks = new Array();
	var i = 0;

	if ($("#postID")) {
		postContent.ID = parseInt($("#postID").val())
	} else {
		postContent.ID = 0
	}

	// to link post with a FB post and merge comments
	var fbPostID = $('#fbpostID').val()

	if (fbPostID && fbPostID != "") // not empty
	{
		postContent.fbpostID = $('#fbpostID').val()
	}

	// date
	postContent.datestring = $('#datepicker').val()
	postContent.timestring = $('#timepicker').val()

	// config
	postContent.showComs = $('#showComments').is(':checked')
	postContent.acceptComs = $('#acceptComments').is(':checked')
	postContent.approveComs = $('#commentsRequireApproval').is(':checked')
	postContent.isPage = $('#isPage').is(':checked')

	if ($('#slug').val() != "") {
		postContent.slug = $('#slug').val()
	}

	$('#blocks').children().each(function ()
	{
		var block = new Object()
		var insert = true
		//postContent[i].id = this.id;

		if ($(this).hasClass("block_text"))
		{
			block.type = "text"
			block.text = $(this).html()
			// cleanup
			block.text = block.text.replace(/<[\/]*(div|span)[^>]*>/g, '')
		}
		else if ($(this).hasClass("block_file"))
		{
			block.type = "file"
			block.url = $(this).html()
			block.filename = "error"

			var components = block.url.split("/");
			if (components.length > 0) {
				block.filename = components[components.length-1]	
			}
		}
		else if ($(this).hasClass("block_html"))
		{
			block.type = "html"
			block.data = $(this).val()
		}
		else if ($(this).hasClass("block_gallery"))
		{
			block.type = "gallery"
			block.data = $(this).children('textarea')[0].value
		}
		else if ($(this).hasClass("block_image"))
		{
			block.type = "image"
			block.path = $($(this).children('img')[0]).attr( 'src' )
			
			var srcset = $($(this).children('img')[0]).attr( 'srcset' )
			if (srcset) {
				var parts = srcset.split(" ");
				if (parts.length == 2 && parts[1] == "2x") {
					block.retina = parts[0]
				}
			}

			block.url = $($(this).children('input')[0]).val()
			block.description = $($(this).children('input')[1]).val()
		}
		else if ($(this).hasClass("block_contact"))
		{
			block.type = "contact"
			block.to = $($(this).children('div')[0]).children('input')[0].value
			block.title = $($(this).children('div')[1]).children('input')[0].value
		}
		else if ($(this).hasClass("block_video"))
		{
			block.type = "video"
		}
		else
		{
			insert = false
			block.type = "unknown type"
		}

		if (insert) {
			blocks[i] = block;
			i++;
		}
	});

	postContent.blocks = blocks;
	postContent.title = $("#postTitle").val();

	notDirty()

	Post('/admin/save',postContent,editPostCallBack,errCallback);
}

function saveGeneralSettings() {

	var config = new Object()

	config.langs = $("#config-langs").val().split(",")

	var postsPerPage = parseInt($("#config-postsPerPage").val())
	if (isNaN(postsPerPage)) {
		alert("Posts per page: not a number")
		return
	}
	config.postsPerPage = postsPerPage

	config.timezone = $("#config-timezone").val()

	config.showComments = $('#config-showComments').is(':checked')
	config.acceptComments = $('#config-acceptComments').is(':checked')
	config.approveComments = $('#config-approveComments').is(':checked')

	config.host = $('#config-host').val()

	config.imageImportRetina = $('#config-imageImportRetina').is(':checked')

	var popup = popupLoading()

	Post('/admin/settings',config,function(response) {
		popupDone(popup)
	}, function(errorResponse){
		popup.remove()
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	})
}

function updateCredentials() {
	var credentials = new Object()

	credentials.username = $("#username").val()
	credentials.currentPassword = $("#currentPassword").val()
	credentials.newPassword = $("#newPassword").val()
	credentials.newPasswordRepeat = $("#newPasswordRepeat").val()

	if (credentials.newPassword != credentials.newPasswordRepeat) {
		alert("New password does not match the confirm password.")
		return
	}

	var popup = popupLoading()

	Post('/admin/settings/credentials', credentials, function(response) {
		$("#currentPassword").val("")
		$("#newPassword").val("")
		$("#newPasswordRepeat").val("")
		popupDone(popup)
	}, function(errorResponse){
		popup.remove()
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	})
}

function updateSendgridApiKey() {
	var req = new Object()
	req.apiKey = $("#sendgridApiKey").val()

	var popup = popupLoading()

	Post('/admin/settings/sendgrid', req, function(response) {
		popupDone(popup)
	}, function(errorResponse){
		popup.remove()
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	})
}

// COMMENTS

function acceptComment(comID)
{
	var obj = {}
	obj["id"] = comID

	var popup = popupLoading()

	Post('/admin/comments/accept', obj, function(response) {
		// popupDone(popup)
		location.reload()
	}, function(errorResponse) {
		popup.remove()
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	});
}

function deleteComment(comID)
{
	var obj = {}
	obj["id"] = comID

	var r = confirm("Are you sure?")
	
	if (r == true) 
	{
		var popup = popupLoading()

		Post('/admin/comments/delete', obj, function(response) {
			
			// $("#com" + comID).remove()
			location.reload()

		}, function(errorResponse) {
			popup.remove()
			if (errorResponse.message) {
				alert(errorResponse.message)
			} else {
				alert("error!")
			}
		});
	}
	else { /* do nothing */ }
}

function highlightComment(comID) {
	var obj = {}
	obj["id"] = comID

	var el = $('#comment-highlight-btn-'+comID)

	var action = 'highlight'
	if (el.hasClass('starred')) {
		action = 'unhighlight'	
	}

	el.toggleClass('starred')

	Post('/admin/comments/'+action, obj, function(response) {
		// don't do anything
	}, function(errorResponse) {
		if (errorResponse.message) {
			alert(errorResponse.message)
		} else {
			alert("error!")
		}
	});
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
