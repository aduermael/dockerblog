
// applies glitter effect on highlighted comments
function startGlitterEffect() {
  	var template = $('#empty-div')
	var stars =  15
	var sparkle = 10
    
	var size = 'small'
	var halfSizes = Object()
	halfSizes["small"] = 10;
	halfSizes["medium"] = 15;
	halfSizes["large"] = 25;

	var createStar = function(target) {
		template.clone().removeAttr('id').addClass('shine').css({
			top: Math.random() * target.outerHeight() - halfSizes[size],
			left: Math.random() * target.outerWidth() - halfSizes[size],
			webkitAnimationDelay: (Math.random() * sparkle) + 's',
			mozAnimationDelay: (Math.random() * sparkle) + 's'
		}).addClass(size).appendTo(target)
	};

	$('.starred').each( function() {
		for(var i = 0; i < stars; i++) {
			if(i % 2 === 0) {
				size = 'small'
			} else if(i % 3 === 0) {
				size = 'medium'
			} else {
				size = 'large'
			}
			createStar($(this))
		}
	})
}


function stopGlitterEffect() {
	$('.shine').remove();
}