

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
	comment.url = $('#url').val();
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


$(function(){

	Galleria.loadTheme('/js/galleria/themes/classic/galleria.classic.min.js');
		Galleria.configure({
	    transition: 'fade', 
	    lightbox: true, 
	    thumbnails: 'lazy',
	});

	Galleria.ready(function(options) {

		var lightboxIndex = 0

		this.bind('lightbox_image', function(e) {
			var image = (e.imageTarget.getAttribute("src"))
			for (var i = 0; i < this._data.length; i++) {
				if (this._data[i].image == image) {
					lightboxIndex = i;
					setCookie("gallery-page-" + this._target.id, lightboxIndex)
					break;
				}
			}

			if (this._lightbox.active == this._data.length - 1) {
				$('.galleria-lightbox-next').hide();
				$('.galleria-lightbox-nextholder').hide();
			} else {
				$('.galleria-lightbox-next').show();
				$('.galleria-lightbox-nextholder').show();
			}
			if (this._lightbox.active == 0) {
				$('.galleria-lightbox-prev').hide();
				$('.galleria-lightbox-prevholder').hide();
			} else {
				$('.galleria-lightbox-prev').show();
				$('.galleria-lightbox-prevholder').show();
			}
		});

		this.bind('lightbox_close', function(e) {
			this.show( lightboxIndex )
		});
		

		this.bind('image', function(e) {
			setCookie("gallery-page-" + this._target.id, e.index)
		});

		this.bind('loadstart', function(e) {
			var selector = $("#" + this._target.id + "-pages")[0]
			selector.options.selectedIndex = e.index

			// don't display next for last image
			if (this._active == this._data.length - 1) {
				$('.galleria-image-nav-right').hide();
			} else {
				$('.galleria-image-nav-right').show();
			}
			// don't display previous for first image
			if (this._active == 0) {
				$('.galleria-image-nav-left').hide();
			} else {
				$('.galleria-image-nav-left').show();
			}
		});

	});

	$(".gallery").each( function(index) {
		// this: gallery block
		// id: post<ID>-block<number>
		var gallery = this

		var page = getCookie("gallery-page-" + gallery.id)
		if (page == "") {
			page = 0
		}

		if (page > galleryData[gallery.id].length) {
			page = 0;
		}

		Galleria.run(gallery, {
			dataSource: galleryData[gallery.id], 
			show: page,
			extend: function() {
	            var gallery = this; // "this" is the gallery instance
	            $("#" + gallery._target.id + "-pages")[0].onchange = function() {
					gallery.show($(this).val());
				}
        	}
		});

	});
})


function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length,c.length);
        }
    }
    return "";
}