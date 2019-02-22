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

var defaultGravar = "https://bloglaurel.com/img/avatar.jpg"
