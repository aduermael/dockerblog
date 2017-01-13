
var mandatoryColor = '#E0E0E0'
var optionalColor = '#e7e7e7'
var errorColor = '#f78778'

$(document).ready(function()
{
	$('.comment').linkify()
})

function sendMessage(postID,blockID,emailIndication,subjectIndication)
{	
	var message = new Object()
	message.postID = postID;
	message.blockID = blockID;
	message.email = $('#contactEmail_' + postID + '_' + blockID).val();
	message.subject = $('#contactSubject_' + postID + '_' + blockID).val();
	message.content = $('#contactContent_' + postID + '_' + blockID).val();
	message.url = $('#contactUrl_' + postID + '_' + blockID).val();

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
		$('#commentSending_' + postID + '_' + blockID).show();
		
		Post('/contact',message,sendMessageCallback,errorCallback);			
	}
	
}


var sendMessageCallback = function(data)
{
	var res = data
	
	$( "div[id^='formsending_']" ).each(function( index )
	{	
		if ($(this).is(":visible"))
		{	
			var id = $(this).attr('id')
			var elements = id.split('_')
			
			if(res.success)
			{
				elements.splice(0,1,"formsent")
				var idSent = elements.join("_")
				idSent = "#" + idSent
				$(idSent).show()
			}
			else
			{
				elements.splice(0,1,"formerror")
				var idError = elements.join("_")
				idError = "#" + idError
				$(idError).show()	
			}
			
			$(this).hide()
		}
	});
}



function postComment(nameIndication,emailIndication,websiteIndication,twitterIndication)
{
	var comment = new Object()
	// ids
	comment.postID = $('#postID').val()
	comment.answerComID = $('#answerComID').val()

	// simple trap for stupid robots
	comment.url = $('#url').val()
	comment.email = $('#email').val()
	
	// content
	comment.name = $('#commentName').val()
	comment.email = $('#commentEmail').val()
	comment.content = $('#commentContent').val()
	comment.website = $('#commentWebsite').val()
	comment.twitter = $('#commentTwitter').val()
	comment.emailOnAnswer = $('#commentEmailOnAnswer').is(":checked")
	comment.remember = $('#commentRemember').is(":checked")
	
	var error = false;
	// name (mandatory)
	if (comment.name == "" || comment.name == nameIndication)
	{
		setBackgroundColor($('#commentName'),errorColor)
		error = true
	}
	// email
	if (comment.email == emailIndication || comment.email == "")
	{
		comment.email = ""
	}
	else if ( !validateEmail(comment.email) )
	{
		setBackgroundColor($('#commentEmail'),errorColor)
		error = true
	}
	// website
	if (comment.website == websiteIndication || comment.website == "")
	{
		comment.website = ""
	}
	// twitter
	if (comment.twitter == twitterIndication || comment.twitter == "")
	{
		comment.twitter = ""
	}
	// content (mandatory)
	if (comment.content == "")
	{
		setBackgroundColor($('#commentContent'),errorColor)
		error = true
	}
	
	if (!error)
	{
		$('#commentFields').hide()
		$('#commentSending').show()
		Post('/comment',comment,postCommentCallback,errorCallback)
	}
}


var postCommentCallback = function(data)
{
	var res = data

	$('#commentSending').hide();
		
	if(res.success)
	{
		$('#commentSent').show();
	}
	else
	{
		$('#commentError').show();
	}
}


function answerComment(comID)
{
	// reset form
	$('#commentFields').show()
	$('#commentSending').hide()
	$('#commentSent').hide()
	$('#commentError').hide()
	$('#commentContent').val("")
	// move answer form
	$('#com_end_' + comID).after($('#form'))
	$('#answerComID').val(comID)
}

// emailChange tries to load a Gravatar associated
// to current email in the field.
function emailChange(emailInput)
{
	var hash = getGravatarHash(emailInput.value)
	$('#commentGravatar').attr("src",'http://www.gravatar.com/avatar/' + hash + '.jpg?s=80')
}

// getGravatarHash returns a Gravatar md5 hash 
// for a given email.
function getGravatarHash(email)
{
	email = $.trim(email)
	email = email.toLowerCase()
	var md5 = $.md5(email)
	return md5
}

// backToOriginalBackground resets background in all fields
function backToOriginalBackground(obj)
{			
	if ($(obj).attr('id') == $('#commentName').attr('id'))
	{	
		setBackgroundColor($('#commentName'),mandatoryColor)
	}
	else if ($(obj).attr('id') == $('#commentContent').attr('id'))
	{
		setBackgroundColor($('#commentContent'),mandatoryColor)
	}
	else if ($(obj).attr('id') == $('#commentEmail').attr('id'))
	{
		setBackgroundColor($('#commentEmail'),optionalColor)
	}
	else
	{
		if ($(obj).hasClass( "mandatory" )) { setBackgroundColor($(obj),mandatoryColor) }
		else { setBackgroundColor($(obj),optionalColor) }
	}
}

// setBackgroundColor sets background color for
// given HTML element (animated)
function setBackgroundColor(obj,color)
{
	obj.stop().animate({
			backgroundColor: color
		}, 'fast')
}

// validateEmail tests wether given string in parameter
// is a valid email or not.
function validateEmail(email) 
{
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}
