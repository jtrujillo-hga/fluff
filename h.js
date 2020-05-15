var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

let users = [];
let admin = "";
let turn = 0;
let rollReady = true;
let curBet = {name:"", quantity:0, value:0};
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
		io.sockets.emit("message_to_client",{name:data["name"], message:data["message"] }) // broadcast the message to other users
	});

	socket.on('login_to_server', function(data) {
		console.log("length: ");
		console.log(users.length);
		let s = true;
		let a = false;
		for (let u=0; u<users.length; ++u) {
			console.log(users[u]);
			if (data["name"] == users[u].name) {
				s = false;
				io.sockets.emit("login_to_client",{name:data["name"], message:"Nickname is already used. Try a different one", admin:a});
			}
		}
		if (s) {
			if (users.length == 0) {
				admin = data["name"];
				a = true;
			}
			users.push({name:data["name"],dice:[0,0,0,0,0]});
			io.sockets.emit("login_to_client", {name:data["name"], message:"success", admin:a});
		}
		
	});

	socket.on('players_to_server', function(data){
		// let n = [];
		// let d = [];
		// for (let i=0; i<users.length; ++i) {
		// 	n.push(users[i].name);
		// 	if (users[i].name == data["name"]) {
		// 		d = users[i].dice;
		// 	}
		// }
		// io.sockets.emit("players_to_client", {players:n, dice:d, name:data["name"]});
		
		io.sockets.emit("players_to_client", {users:users});
		
		
	});

	socket.on('start_roll_to_server', function(data){
		if (data["name"] == admin && rollReady) {
			let numWildArray = [];
			let firstTurnIndex = [0];
			for (let i=0; i<users.length; ++i) {
				let numWild = 0;
				for (let j=0; j<5; ++j) {
					if (users[i].dice[j] != "X") {
						let diceRoll = Math.floor(Math.random()*6) + 1;
						if (diceRoll == 1) {
							users[i].dice[j] = "W";
							numWild++;
						}
						else {
							users[i].dice[j] = diceRoll;
						}
					}
				}
				numWildArray.push({name:users[i].name, numWild:numWild});
				if (i > 0) {
					if (numWildArray[i].numWild > numWildArray[firstTurnIndex[0]].numWild) {
						firstTurnIndex = [i];
					}
					else if (numWildArray[i].numWild == numWildArray[firstTurnIndex[0]].numWild) {
						firstTurnIndex.push(i);
					}
				}
			}
			if (firstTurnIndex.length != 1) {
				io.sockets.emit('start_roll_to_client', {firstTurn:"", numWildArray:numWildArray, users:users, admin:admin});
			}
			else {
				rollReady = false;
				turn = firstTurnIndex[0];
				io.sockets.emit('start_roll_to_client', {firstTurn:users[firstTurnIndex[0]].name, numWildArray:numWildArray, users:users, admin:admin});
			}
		}
	});
	socket.on('place_bet_to_server', function(data) {
		if (users[turn].name == data["name"]) {
			if (data["quantity"] > curBet.quantity) {
				curBet = {name:data["name"], quantity:data["quantity"], value:data["value"]};
				if (turn != users.length - 1) {
					turn = turn + 1;
				}
				else {
					turn = 0;
				}
				
				io.sockets.emit('place_bet_to_client', {name:data["name"], quantity:data["quantity"], value:data["value"], valid:true, newTurn:users[turn].name});
			}
			else if (data["quantity"] == curBet.quantity && data["value"] > curBet.value) {
				curBet = {name:data["name"], quantity:data["quantity"], value:data["value"]};
				io.sockets.emit('place_bet_to_client', {name:data["name"], quantity:data["quantity"], value:data["value"], valid:true, newTurn:users[turn].name});
			}
			else {
				io.sockets.emit('place_bet_to_client', {name:data["name"], quantity:data["quantity"], value:data["value"], valid:false, newTurn:""});
			}
		}
	});
})