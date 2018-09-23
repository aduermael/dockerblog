
// applies glitter effect on highlighted comments
function startGlitterEffect() {

  	var template = $('.template.shine')
	var stars =  10
	var sparkle = 5
    
	var size = 'small'

	var createStar = function(target) {
		template.clone().removeAttr('id').css({
			top: (Math.random() * 100) + '%',
			left: (Math.random() * 100) + '%',
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