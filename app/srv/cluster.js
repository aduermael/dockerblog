// Include the cluster module
var cluster = require('cluster');


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

}
else // Code to run if we're in a worker process
{
	require("./app.js");
}
