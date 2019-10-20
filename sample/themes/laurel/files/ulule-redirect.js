
if(window.location.hash) {
     if(window.location.hash.includes("access_token")) {
        console.log("redirect from:", window.location)
        var query = "?" + window.location.hash.substring(1)
        window.location = "/californid-noms" + query;  
     }
}