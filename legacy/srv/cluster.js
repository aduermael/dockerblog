// Include the cluster module
var cluster = require('cluster');



// Collection of Facebook comment is scheduled here 
// and assigned to one of our workers

function randomInt (low, high)
{
    return Math.floor(Math.random() * (high - low) + low);
}

function fbcomments_collect(intervalObject)
{
    var workerIDs = [];

    for (var id in cluster.workers)
    {
        workerIDs.push(id);
    }

    var workerIndex = workerIDs[randomInt(0,workerIDs.length)];
    cluster.workers[workerIndex].send("fbcomments");
}






// Code to run if we're in the master process
if (cluster.isMaster)
{
	// Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0 ; i < cpuCount ; i++)
    {
        cluster.fork();
    }

	// Listen for dying workers
    cluster.on('exit', function (worker)
    {
        // Replace the dead worker, we're not sentimental
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();
    });

    // collect fb commments every 10 minutes 
    setInterval(fbcomments_collect, 10 * 60 * 1000);
}
else // Code to run if we're in a worker process
{
	require("./app.js");
}
