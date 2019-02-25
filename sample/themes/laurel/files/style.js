// backToOriginalBackground resets background in all fields
function backToOriginalBackground(obj) {
	$(obj).removeClass("error")
}

// setBackgroundColor sets background color for
// given HTML element
function setBackgroundColor(obj,color) {
	obj.css("background-color", color)
}

function toggleLire() {
	$("#lire").toggle()
}

$(document).ready(function()
{
	$('.comment').linkify()
	startGlitterEffect()
})

var defaultGravar = "https://bloglaurel.com/theme/img/anonymous.jpg"

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