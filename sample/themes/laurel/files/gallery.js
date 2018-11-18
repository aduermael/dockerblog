
var requestURL = ""
var currentPage = 0
var nbpages = 0
var filePaths = []
var title = ""

function openReader(gallery) {
	$("#content").hide()

	// reset everything
	$("#pages").empty()
	currentPage = 0;
	nbpages = 0;
	filePaths = []
	title = ""
	
	$("#pageimage").attr('src', "/files/gallery/loader.gif")

	$("#reader").show()
	$("#reader-navigation").show()

	if (gallery.nbpages == null) { return }
	nbpages = gallery.nbpages

	if (gallery.filepaths == null) { return }
	filePaths = gallery.filepaths

	if (gallery.title == null) { return }
	title = gallery.title

	if (nbpages == 0) { return }

	for (i=0; i<nbpages; i++) {
		$("#pages").append(
			$('<option></option>').val(filePaths[i]).html("Page " + (i+1))
		);
	}

	savedPage = getCookie("bookmark-" + title)
	if (savedPage == "") {
		currentPage = 0
	} else {
		currentPage = savedPage
	}

	loadCurrentPage()
}

function loadPage(control) {
	currentPage = $("#pages option:selected").index()
	loadCurrentPage()
}

function loadCurrentPage() {
	setCookie("bookmark-" + title, currentPage, 365)
	$("#pageimage").attr('src', "/files/gallery/loader.gif")
	$("#pageimage").attr('src', filePaths[currentPage])
	$("#pages").prop('selectedIndex', currentPage);
}

function nextPage() {
	currentPage++
	if (currentPage >= nbpages) {
		currentPage = nbpages - 1
	}
	loadCurrentPage()
	document.location.href="#top";
}

function previousPage() {
	currentPage--
	if (currentPage < 0) {
		currentPage = 0
	}
	loadCurrentPage()
	document.location.href="#top";
}

function closeReader() {
	$("#reader").hide()
	$("#reader-navigation").hide()
	$("#content").show()
	refreshBookmarks()
}

function refreshBookmarks() {

	$("#tome1-bookmark").hide()
	$("#tome2-bookmark").hide()

	savedPageTome1 = getCookie("bookmark-tome1")
	if (savedPageTome1 != "" && savedPageTome1 != 0) {
		$("#tome1-bookmark-label").multiline("Page\n" + (parseInt(savedPageTome1) + 1))
		$("#tome1-bookmark").show()
	}

	savedPageTome2 = getCookie("bookmark-tome2")
	if (savedPageTome2 != "" && savedPageTome2 != 0) {
		$("#tome2-bookmark-label").multiline("Page\n"+ (parseInt(savedPageTome2) + 1))
		$("#tome2-bookmark").show()
	}
}

// cookies

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

// utils

$.fn.multiline = function(text){
    this.text(text);
    this.html(this.html().replace(/\n/g,'<br/>'));
    return this;
}

// keys 

function turnPage(element, event) {
	var pWidth = $(element).innerWidth(); //use .outerWidth() if you want borders
	var pOffset = $(element).offset(); 
	var x = event.pageX - pOffset.left;
	if(pWidth/2 > x)
		previousPage()
	else
		nextPage()
}

$(document).keydown(function(e) {
	if ($("#reader").is(':visible')) {
   		console.log(e.keyCode);
		// left arrow
		if (e.keyCode == 37) {
			previousPage()
		}
		// right arrow
		else if (e.keyCode == 39) {
			nextPage()
		}
		// esc
		else if (e.keyCode == 27) {
			closeReader()
		}
	}
});

function toggle(sender) {
	li = sender.parent().parent()
	if (li.hasClass('open')) {
		li.removeClass('open')
	} else {
		li.addClass('open')
	}
    return false
}
