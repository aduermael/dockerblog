//
//
//
//
//



var myNicEditor;
var nextBlock = 0;
var reorder_mode = false;



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

function addTextBlock(sender)
{
  nextBlock++;
  var blockName = "block" + nextBlock;

  $("#content_blocks").append("<div id=\"" + blockName +"\" class=\"block_text sortable\" style=\"margin-bottom: 10px;background-color: #F7F7F7;border-radius: 5px;outline: none;\">Text</div>");

  myNicEditor.addInstance(blockName);
}

function sendImage(sender)
{
  $("#upload_file_form").submit();
}

function addImageBlock(sender)
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


  $('#content_blocks').children().each(function ()
  {
    blocks[i] = new Object();

    if ($(this).hasClass("block_text"))
    {
      blocks[i].type = "text";
      blocks[i].text = $(this).html();
      console.log("add text block");
    }
    else if ($(this).hasClass("block_image"))
    {
      blocks[i].type = "image";
      blocks[i].path = $($(this).children('img')[0]).attr( 'src' );
      blocks[i].url = $($(this).children('div')[0]).children('input')[0].value;
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
      console.log("add text block");
    }
    else if ($(this).hasClass("block_image"))
    {
      blocks[i].type = "image";
      blocks[i].path = $($(this).children('img')[0]).attr( 'src' );
      blocks[i].url = $($(this).children('div')[0]).children('input')[0].value;
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




function sendPost(sender)
{
  var postContent = new Object()
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
    else if ($(this).hasClass("block_image"))
    {
      blocks[i].type = "image";
      blocks[i].path = $($(this).children('img')[0]).attr( 'src' );
      blocks[i].url = $($(this).children('div')[0]).children('input')[0].value;
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
    else if ($(this).hasClass("block_image"))
    {
      blocks[i].type = "image";
      blocks[i].path = $($(this).children('img')[0]).attr( 'src' );
      blocks[i].url = $($(this).children('div')[0]).children('input')[0].value;
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

var acceptCommentCallBack = function(data)
{
	var res = data;

	if(res.success)
	{
		document.location = "/admin/comments";
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
		document.location = "/admin/comments";
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
      $(".block_text").css('border','1px dashed #000');
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

	$('#content_blocks >').each(function(i,obj)
	{
		var blockID = parseInt($(obj).attr('id').substring(5));
		if (nextBlock <= blockID) nextBlock = blockID + 1;
		console.log('child: ' + $(obj).attr('id').substring(5));
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
			$(".block_contact").css('border','none');
			
			reorder_mode = false;
		}
	});


	myNicEditor = new nicEditor({buttonList : ['bold','underline','link','unlink']});
	myNicEditor.setPanel('myNicPanel');

	myNicEditor.addEvent('focus', function(e)
	{
		if (!reorder_mode)
		{
			var id = myNicEditor.selectedInstance.e.id;

			$("#myNicPanel").show();

			$("#myNicPanel").css(
			{
				top:($("#"+id).offset().top - 10) +'px',
				left:(-$("#myNicPanel").outerWidth()) +'px',
			});
		}
	});

	myNicEditor.addEvent('panel', function(e)
	{
		console.log("PANEL");
	});


	myNicEditor.addEvent('blur', function(e)
	{
		$("#myNicPanel").hide();
	});

	$('.block_text').each(function (i, obj)
	{
		myNicEditor.addInstance($(obj).attr('id'));
	});


	$("form#upload_file_form").submit(function(e)
	{
		e.preventDefault();
		//grab all form data
		var formData = new FormData($(this)[0]);
		var inputs = document.getElementById('upload_file_input');
		
		if (inputs.files.length > 0)
		{
			PostFiles('/admin/image',formData,uploadFileCallback,errorCallback);
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
		
		$("#content_blocks").append("<div id=\"" + blockName +"\" class=\"edit_post_zone backgroundLevel_8 block_image sortable\"><img src=\"" + res.image_path + "\"/><div class=\"edit_img_url_zone\">url: <input class=\"edit_img_url_field\" id=\"imageurl\" name=\"imageurl\" type=\"text\" value=\"\"/></div></div>");
	}
	else
	{
		alert("FAILED");
	}
}
