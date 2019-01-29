// ---------------
// CONFIG
// ---------------

// var mandatoryColor = '#fff'
// var optionalColor = '#f5f5f5'
// var errorColor = '#f78778'

// turns urls into active links 
// in the list of comments
$(document).ready(function()
{
	$('.comment').linkify()
	startGlitterEffect()
})

var resizeTimer;
var resizeStarted = false

$(window).on('resize', function(e) {
	if (resizeStarted == false) {
		resizeStarted = true
		stopGlitterEffect()
	}

	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(function() {
		resizeStarted = false
		startGlitterEffect()	
	}, 250);
});

// ---------------
// CONTACT FORMS
// ---------------

function sendMessage(postID,blockID,emailIndication,subjectIndication)
{	
	var message = new Object()
	message.postID = postID
	message.blockID = blockID
	message.email = $('#contactEmail_' + postID + '_' + blockID).val()
	message.subject = $('#contactSubject_' + postID + '_' + blockID).val()
	message.content = $('#contactContent_' + postID + '_' + blockID).val()
	message.url = $('#contactUrl_' + postID + '_' + blockID).val()

	var error = false;
	
	if (!validateEmail(message.email)) {
		$('#contactEmail_' + postID + '_' + blockID).addClass("error")
		error = true
	}
	
	if (message.subject == subjectIndication || message.subject == "") {
		message.subject = ""
	}
	
	if (message.content == "") {
		$('#contactContent_' + postID + '_' + blockID).addClass("error")
		error = true
	}
	
	if (!error) {
		$('#contactFields_' + postID + '_' + blockID).hide()
		$('#commentSending_' + postID + '_' + blockID).show()
		Post('/contact',message,sendMessageCallback,errorCallback)		
	}
}


var sendMessageCallback = function(data) {
	var res = data
	
	$( "div[id^='formsending_']" ).each(function( index ) {	
		if ($(this).is(":visible")) {	
			var id = $(this).attr('id')
			var elements = id.split('_')
			
			if(res.success) {
				elements.splice(0,1,"formsent")
				var idSent = elements.join("_")
				idSent = "#" + idSent
				$(idSent).show()
			} else {
				elements.splice(0,1,"formerror")
				var idError = elements.join("_")
				idError = "#" + idError
				$(idError).show()	
			}
			
			$(this).hide()
		}
	});
}

// ---------------
// COMMENTS
// ---------------

function postComment(nameIndication,emailIndication,websiteIndication,twitterIndication) {
	var comment = new Object()
	// ids
	comment.postID = parseInt($('#postID').val())
	comment.answerComID = parseInt($('#answerComID').val())

	// simple trap for stupid robots
	comment.urltrap = $('#url').val()
	comment.emailtrap = $('#email').val()
	
	// content
	comment.name = $('#commentName').val()
	comment.email = $('#commentEmail').val()
	comment.content = $('#commentContent').val()
	comment.website = $('#commentWebsite').val()
	comment.twitter = $('#commentTwitter').val()
	comment.emailOnAnswer = $('#commentEmailOnAnswer').is(":checked")
	comment.rememberInfo = $('#commentRemember').is(":checked")
	
	var error = false;

	// name (mandatory)
	if (comment.name == "" || comment.name == nameIndication) {
		$('#commentName').addClass("error")
		error = true
	}
	// email
	if (comment.email == emailIndication || comment.email == "") {
		comment.email = ""
	} else if ( !validateEmail(comment.email) ) {
		$('#commentEmail').addClass("error")
		error = true
	}
	// website
	if (comment.website == websiteIndication || comment.website == "") {
		comment.website = ""
	}
	// twitter
	if (comment.twitter == twitterIndication || comment.twitter == "") {
		comment.twitter = ""
	} else if ( !validateTwitterUsername(comment.twitter) ) {
		$('#commentTwitter').addClass("error")
		error = true
	}
	// content (mandatory)
	if (comment.content == "") {
		$('#commentContent').addClass("error")
		error = true
	}
	
	if (!error) {
		$('#commentFields').hide()
		$('#commentSending').show()
		Post('/comment',comment,function(response) {
			$('#commentSending').hide()
			if (response.success) { 
				if (response.waitingForApproval) {
					$('#commentWaitingForApproval').show()
				} else {
					$('#commentSent').show()	
				}
			}

		}, function(errorResponse) {
			if (errorResponse.message) {
				alert(errorResponse.message)
			} else {
				alert("error!")
			}
		})
	}
}

// // postCommentCallback is used as callback when posting comment
// var postCommentCallback = function(data) {
// 	var res = data
// 	$('#commentSending').hide()
// 	if(res.success) { $('#commentSent').show() }
// 	else { $('#commentError').show() }
// }

// answerComment moves the form below the comment
// the user wants to answer to. (resetting fields)
// (it also sets the answerComID field)
function answerComment(comID) {
	// reset form
	$('#commentFields').show()
	$('#commentSending').hide()
	$('#commentSent').hide()
	$('#commentWaitingForApproval').hide()
	$('#commentError').hide()
	$('#commentContent').val("")
	$('#answerComID').val(comID)
	
	// move answer form
	$('#commentForm').fadeTo(0, 0.0, function() {
		$('#commentForm').insertAfter($('#com_' + comID))
		$('#commentForm').fadeTo(300, 1.0)
		$('#initial-comment-form-container').hide()
	});
}

// emailChange tries to load a Gravatar associated
// to current email in the field.
function emailChange(emailInput) {
	var hash = getGravatarHash(emailInput.value)
	$('#commentGravatar').attr("src",'http://www.gravatar.com/avatar/' + hash + '.jpg?s=80')
}

// getGravatarHash returns a Gravatar md5 hash 
// for a given email.
function getGravatarHash(email) {
	email = $.trim(email)
	email = email.toLowerCase()
	var md5 = $.md5(email)
	return md5
}

// validateEmail tests wether given string in parameter
// is a valid email or not.
function validateEmail(email) {
    var re = /^\S+@\S+\.\S+$/
    return re.test(email)
}

function validateTwitterUsername(username) {
	console.log(username)
    var re = /^@?[a-zA-Z0-9_]+$/
    return re.test(username)
}

function showArchives(sender) {
	var optionSelected = $(sender).find(":selected")
	if (optionSelected != null && optionSelected.val() != "") {
		window.location.href = "/archives/" + optionSelected.val()
	}
}

function newsletterFormCheck(sender) {
	var emailIsValid = validateEmail($("#newsletterEmail").val())
	var oneCheckedAtLeast = $("#newsletterNewsCheckbox").is(":checked") || $("#newsletterPostsCheckbox").is(":checked")

	if (emailIsValid && oneCheckedAtLeast) {
		$("#newsletterButton").prop('disabled', false)
		$("#newsletterButton").val("Enregistrer")
		return true
	} else {
		$("#newsletterButton").prop('disabled', true)
		return false
	}
}

function newsletterRegister(sender) {
	if (newsletterFormCheck(sender) == true) {

		$("#newsletterEmail").prop('disabled', true)
		$("#newsletterNewsCheckbox").prop('disabled', true)
		$("#newsletterPostsCheckbox").prop('disabled', true)

		$("#newsletterButton").prop('disabled', true)
		$("#newsletterButton").val("⏳")

		var request = new Object()
		request.email = $("#newsletterEmail").val()
		request.news = $("#newsletterNewsCheckbox").is(":checked")
		request.posts = $("#newsletterPostsCheckbox").is(":checked")
		Post('/newsletter-register',request,newsletterRegisterCallback,newsletterRegisterErrorCallback)
	}
}

function newsletterRegisterCallback(data) {

	$("#newsletterEmail").prop('disabled', false)
	$("#newsletterNewsCheckbox").prop('disabled', false)
	$("#newsletterPostsCheckbox").prop('disabled', false)

	$("#newsletterButton").val("✅")
}

function newsletterRegisterErrorCallback(data) {

	$("#newsletterEmail").prop('disabled', false)
	$("#newsletterNewsCheckbox").prop('disabled', false)
	$("#newsletterPostsCheckbox").prop('disabled', false)

	$("#newsletterButton").val("❌")
	alert("Erreur, l'email n'a pas pu être enregistré. 😕")
}



