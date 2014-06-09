

var mandatoryColor = '#E0E0E0';
var optionalColor = '#e7e7e7';
var errorColor = '#f78778';

$(document).ready(function()
{

});


function postComment(nameIndication,emailIndication)
{
	var comment = new Object()
	comment.postID = $('#postID').val();
	comment.vID = $('#verificationID').val();
	comment.name = $('#commentName').val();
	comment.email = $('#commentEmail').val();
	comment.content = $('#commentContent').val();
	
	var error = false;
	
	
	if (comment.name == "" || comment.name == nameIndication)
	{
		setBackgroundColor($('#commentName'),errorColor);
		error = true;
	}
	
	if (comment.email == emailIndication || comment.email == "")
	{
		comment.email = "";
	}
	else if ( !validateEmail(comment.email) )
	{
		setBackgroundColor($('#commentEmail'),errorColor);
		error = true;
	}
	
	if (comment.content == "")
	{
		setBackgroundColor($('#commentContent'),errorColor);
		error = true;
	}
	
	if (!error)
	{
		$('#fields').hide();
		$('#formsending').show();
		
		Post('/comment',comment,postCommentCallback,errorCallback);			
	}
}

var postCommentCallback = function(data)
{
	var res = data;

	$('#formsending').hide();
		
	if(res.success)
	{
		$('#formsent').show();
	}
	else
	{
		$('#formerror').show();
	}
}


function backToOriginalBackground(obj)
{			
	if ($(obj).attr('id') == $('#commentName').attr('id'))
	{	
		setBackgroundColor($('#commentName'),mandatoryColor);
	}
	else if ($(obj).attr('id') == $('#commentContent').attr('id'))
	{
		setBackgroundColor($('#commentContent'),mandatoryColor);
	}
	else if ($(obj).attr('id') == $('#commentEmail').attr('id'))
	{
		setBackgroundColor($('#commentEmail'),optionalColor);
	}
}

function setBackgroundColor(obj,color)
{
	obj.stop().animate({
			backgroundColor: color
		}, 'fast')
}

function validateEmail(email) 
{
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}