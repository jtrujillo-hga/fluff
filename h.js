var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

let users = [];
// Listen for HTTP connections. 
var app = http.createServer(function(req, resp){
	fs.readFile("fluff.html", function(err, data){
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		io.sockets.emit("message_to_client",{message:data["message"] }) // broadcast the message to other users
	});

	socket.on('login_to_server', function(data) {
		console.log("length: ");
		console.log(users.length);
		let s = true;
		for (let u=0; u<users.length; ++u) {
			console.log(users[u]);
			if (data["name"] == users[u].name) {
				s = false;
				io.sockets.emit("login_to_client",{name:data["name"], message:"Nickname is already used. Try a different one"});
			}
		}
		if (s) {
			users.push({name:data["name"],dice:[0,0,0,0,0]});
			io.sockets.emit("login_to_client", {name:data["name"], message:"success"});
		}
		
	});
})