

var mandatoryColor = '#E0E0E0';
var optionalColor = '#e7e7e7';
var errorColor = '#f78778';

$(document).ready(function()
{

});


function sendMessage(postID,blockID,emailIndication,subjectIndication)
{	
	var message = new Object()
	message.postID = postID;
	message.blockID = blockID;
	message.email = $('#contactEmail_' + postID + '_' + blockID).val();
	message.subject = $('#contactSubject_' + postID + '_' + blockID).val();
	message.content = $('#contactContent_' + postID + '_' + blockID).val();
	
	var error = false;
	
	if ( !validateEmail(message.email) )
	{
		setBackgroundColor($('#contactEmail_' + postID + '_' + blockID),errorColor);
		error = true;
	}
	
	if (message.subject == subjectIndication || message.subject == "")
	{
		message.subject = "";
	}
	
	if (message.content == "")
	{
		setBackgroundColor($('#contactContent_' + postID + '_' + blockID),errorColor);
		error = true;
	}
	
	
	if (!error)
	{
		$('#contactFields_' + postID + '_' + blockID).hide();
		$('#formsending_' + postID + '_' + blockID).show();
		
		Post('/contact',message,sendMessageCallback,errorCallback);			
	}
	
}


var sendMessageCallback = function(data)
{
	var res = data;
	
	$( "div[id^='formsending_']" ).each(function( index )
	{	
		if ($(this).is(":visible"))
		{	
			var id = $(this).attr('id');
			
			var elements = id.split('_');
			
			if(res.success)
			{
				elements.splice(0,1,"formsent");
				var idSent = elements.join("_");
				idSent = "#" + idSent;
							
				$(idSent).show();
			}
			else
			{
				elements.splice(0,1,"formerror");
				var idError = elements.join("_");
				idError = "#" + idError;
							
				$(idError).show();			
			}
			
			$(this).hide();	
		}
	});
}



function postComment(nameIndication,emailIndication,websiteIndication,twitterIndication)
{
	var comment = new Object()
	comment.postID = $('#postID').val();
	comment.answerComID = $('#answerComID').val();
	comment.name = $('#commentName').val();
	comment.email = $('#commentEmail').val();
	comment.content = $('#commentContent').val();

	comment.website = $('#commentWebsite').val();
	comment.twitter = $('#commentTwitter').val();
	
	comment.emailOnAnswer = $('#comEmailOnAnswer').is(":checked");
	comment.remember = $('#comRemember').is(":checked");
	
	
	
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

	// check valid website
	if (comment.website == websiteIndication || comment.website == "")
	{
		comment.website = "";
	}

	// limit # of characters
	if (comment.twitter == twitterIndication || comment.twitter == "")
	{
		comment.twitter = "";
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


function answerComment(comID)
{
	// reset form
	$('#fields').show();
	$('#formsending').hide();
	$('#formsent').hide();
	$('#formerror').hide();
	$('#commentContent').val("");


	$('#com_end_' + comID).after($('#form'));
	$('#answerComID').val(comID);
}


function emailChange(emailInput)
{
	var hash = getGravatarHash(emailInput.value)
	console.log("hash: " + hash); 
	$('#formGravatar').attr("src",'http://www.gravatar.com/avatar/' + hash + '.jpg?s=81');
}

function getGravatarHash(email)
{
	email = $.trim(email);
	email = email.toLowerCase();
	var md5 = $.md5(email);
	return md5;
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
	else
	{
		if ($(obj).hasClass( "mandatory" ))
		{
			setBackgroundColor($(obj),mandatoryColor);
		}
		else
		{
			setBackgroundColor($(obj),optionalColor);
		}
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