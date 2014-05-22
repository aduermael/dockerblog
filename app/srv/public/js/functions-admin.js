var myNicEditor;
var nextBlock=0;
var reorder_mode = false;
  





function PostFiles(path,formData,callback,errorCallback)
{
  $.ajax
  (
    {
      url: SERVER + path,
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
  
  console.log(blockName);
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


function editPost(sender)
{
  var postContent = new Object()
  postContent.lang = $('#langSelector option:selected').val();
  postContent.ID = $('#postID').attr('value');
  var blocks = new Array();
  var i = 0;

  console.log("EDIT POST: " + postContent.ID);


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
    else if ($(this).hasClass("block_title"))
    {
      blocks[i].type = "title";
      blocks[i].text = $(this).children('input')[0].value;

      console.log("add title block");
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

  Post('/admin/edit',postContent,editPostCallBack,errorCallback);
}


var editPostCallBack = function(data)
{
  var res = data;

  if(res.success)
  {
    document.location = "/admin/posts/" + $('#langSelector option:selected').val();
  }
  else
  {
    alert("FAILED");   
  }
}




function sendPost(sender)
{
  var postContent = new Object()
  postContent.lang = $('#langSelector option:selected').val();
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
    else if ($(this).hasClass("block_title"))
    {
      blocks[i].type = "title";
      blocks[i].text = $(this).children('input')[0].value;
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

  Post('/admin/new',postContent,editPostCallBack,errorCallback);
}



// COMMENTS

function acceptComment()
{
	alert("accept comment");
}

function deleteComment()
{
	alert("delete comment");
}

// CONFIG

function configAddKey(sender)
{
	var postContent = new Object()
	postContent.key = $('#addKey').val();
	postContent.value = $('#addValue').val();
	postContent.lang = $('#langSelector option:selected').val();
	
	alert(JSON.stringify(postContent));
  
	//Post('/admin/config/key',postContent,configAddKeyCallBack,errorCallback);
}

var configAddKeyCallBack = function(data)
{
  if(res.success)
  {
    document.location = "/admin/config/" + $('#langSelector option:selected').val();
    alert("OK!");
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
			PostFiles('/image',formData,uploadFileCallback,errorCallback);
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


