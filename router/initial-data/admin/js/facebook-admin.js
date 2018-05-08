
// window.fbAsyncInit = function() {
// 	console.log("FB ASYNC INIT")

// 	FB.init({appId: 'XXX', status: true, cookie: true, xfbml: true});

// 	};
// 	(function() {
// 	var e = document.createElement('script'); e.async = true;
// 	e.src = document.location.protocol +
// 	'//connect.facebook.net/en_US/all.js';
// 	document.getElementById('fb-root').appendChild(e);
// }());

function facebook_store_token(token, expiresIn) {
	$("#token").html("<strong>Token: </strong>"+token)
	$("#expiration").html("<strong>Expires: </strong>"+moment().add(expiresIn, 'seconds').fromNow())

	FB.api('/me', function(response) {
		$("#username").html("<strong>Connected as: </strong>"+response.name)
	});
}

function facebook_login() {
	FB.login(function(response) {
	    if (response.authResponse) {
	    	var accessToken = response.authResponse.accessToken;
	    	var expiresIn = response.authResponse.expiresIn;
	    	facebook_store_token(accessToken, expiresIn);
	    } else { // failure

	    }
	})
}

function facebook_logout() {
	FB.logout(function(response) {
		// user is now logged out
		$("#token").text("")		
	});
}

function facebook_onlogin() {
	console.log("ON LOGIN")
}

function fetchUserDetail()
{	
	FB.api('/me', function(response) {
		alert("Name: "+ response.name + "\nFirst name: "+ response.first_name + "ID: "+response.id);
	});
}

function facebook_checkLogin() 
{
	FB.getLoginStatus(function(response) {
		if (response.status === 'connected') {
			// fetchUserDetail();
			var accessToken = response.authResponse.accessToken;
			var expiresIn = response.authResponse.expiresIn;
	    	facebook_store_token(accessToken, expiresIn);
		} 
		else 
		{
			console.log("FB logged out")
			//initiateFBLogin();
		}
	});
}

function initiateFBLogin()
{
	FB.login(function(response) {
		fetchUserDetail();
	});
}