
var requestURL = ""
var currentPage = 0
var nbpages = 0
var filePaths = []
var title = ""
var imgFileExtention = ""
var retinaSuffix = ""
var supportRetina = false
var bookmark = null

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

	// if (gallery.nbpages == null) { return }
	// nbpages = gallery.nbpages

	if (gallery.filepaths == null) { return }
	filePaths = gallery.filepaths

	if (gallery.title == null) { return }
	title = gallery.title

	if (gallery.imgFileExtention == null) { 
		imgFileExtention = ".jpg"
	} else {
		imgFileExtention = gallery.imgFileExtention	
	}

	if (gallery.retinaSuffix == null) { 
		retinaSuffix = "@2x"
	} else {
		retinaSuffix = gallery.retinaSuffix	
	}

	if (gallery.supportRetina == null) { 
		supportRetina = false
	} else {
		supportRetina = gallery.supportRetina	
	}

	bookmark = gallery.bookmark

	// if (nbpages == 0) { return }

	for (i=0; i<filePaths.length; i++) {
		$("#pages").append(
			$('<option></option>').val(filePaths[i]).html("Page " + (i+1))
		);
	}

	currentPage = 0

	if (bookmark != null) {  
		var savedPage = getCookie(bookmark)
		if (savedPage == "") {
			currentPage = 0
		} else {
			currentPage = savedPage
		}
	}

	loadCurrentPage()
}

function loadPage(control) {
	currentPage = $("#pages option:selected").index()
	loadCurrentPage()
}

function loadCurrentPage() {

	if (currentPage >= filePaths.length) {
		currentPage = filePaths.length - 1
	}
	if (currentPage < 0) {
		currentPage = 0
	}

	if (bookmark != null) {
		setCookie(bookmark, currentPage, 365)
	}
	
	$("#pageimage").attr('src', "/files/gallery/loader.gif")
	$("#pageimage").attr('src', filePaths[currentPage] + imgFileExtention)
	if (supportRetina) {
		$("#pageimage").attr('srcset', filePaths[currentPage] + retinaSuffix + imgFileExtention + " 2x")
	}
	$("#pages").prop('selectedIndex', currentPage);
}

function nextPage() {
	currentPage++
	if (currentPage >= filePaths.length) {
		currentPage = filePaths.length - 1
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
	refreshBookmark(bookmark)
}

function refreshBookmark(bookmark) {

	if (bookmark == null) { return }

	var bookmarkDiv = $("#" + bookmark)

	if  (bookmarkDiv == null) { return }

	bookmarkDiv.empty()

	var savedPage = getCookie(bookmark)
	if (savedPage != "" && savedPage != 0) {
		bookmarkDiv.append($("<p>" + "Page<br>" + (parseInt(savedPage) + 1) + "</p>"))
		bookmarkDiv.show()
	} else {
		bookmarkDiv.hide()
	}

	console.log("refreshBookmark end")
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
