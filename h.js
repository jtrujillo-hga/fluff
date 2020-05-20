var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");

let users = [];
let admin = "";
let turn = 0;
let rollReady = true;
let curBet = {name:"", index: 0, quantity:0, value:0};
let gameOn = false;
let diceSize=5;

function getDiceCount(n) {
	let tbr = 0;
	for (let i=0; i<users.length; ++i) {
		for (let j=0; j<users[i].dice.length; ++j) {
			if (users[i].dice[j] == n || users[i].dice[j] == 'W') {
				tbr++;
			}
		}
	}
	return tbr;
}

function nameToIndex(name) {
	for (let i=0; i<users.length; ++i) {
		if (users[i].name == name) {
			return i;
		}
	}
	return -1;
}




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
		let a = false;
		if (gameOn==false) {
			console.log("length: ");
			console.log(users.length);
			let s = true;
			
			for (let u=0; u<users.length; ++u) {
				console.log(users[u]);
				if (data["name"] == users[u].name) {
					s = false;
					
				}
			}
			if (s) {
				if (users.length == 0) {
					admin = data["name"];
					a = true;
				}
				users.push({name:data["name"],dice:[0,0,0,0,0],numDice:5});
				io.sockets.emit("login_to_client", {name:data["name"], message:"success", admin:a});
			}
			else {
				io.sockets.emit("login_to_client", {name:data["name"], message:"name is already taken", admin:a});
			}
			
		}
		else {
			io.sockets.emit("login_to_client",{name:data["name"], message:"game is already in progress", admin:a});
		}
		
		
	});

	socket.on('players_to_server', function(data){
		io.sockets.emit("players_to_client", {name:data["name"], users:users, state:data["state"],admin:admin});
		
		
	});

	socket.on('start_roll_to_server', function(data){
		if (data["name"] == admin && rollReady) {
			if (gameOn == false) {
				gameOn = true;
			}
			let numWildArray = [];
			let totalWild = 0;
			let firstTurnIndex = [0];
			for (let i=0; i<users.length; ++i) {
				let numWild = 0;
				for (let j=0; j<5; ++j) {
					if (j >= 5-users[i].numDice){
						let diceRoll = Math.floor(Math.random()*6) + 1;
						if (diceRoll == 1) {
							users[i].dice[j] = "W";
							numWild++;
							totalWild++;
						}
						else {
							users[i].dice[j] = diceRoll;
						}
					}
					else {
						users[i].dice[j] = "X";
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
			
			console.log(users);
			if (firstTurnIndex.length != 1) {
				io.sockets.emit('start_roll_to_client', {totalWild:totalWild, name:data["name"], firstTurn:"", numWildArray:numWildArray, users:users, admin:admin});
			}
			else {
				curBet = {name:"", index: 0, quantity:0, value:0};
				rollReady = false;
				turn = firstTurnIndex[0];
				io.sockets.emit('start_roll_to_client', {totalWild:totalWild, name:data["name"], firstTurn:users[firstTurnIndex[0]].name, numWildArray:numWildArray, users:users, admin:admin});
			}
		}
	});
	socket.on('place_bet_to_server', function(data) {
		if (users[turn].name == data["name"]) {
			if (parseInt(data["quantity"]) > curBet.quantity) {
				console.log("here")
				console.log("quantity of current bid")
				console.log(curBet.quantity)
				console.log("value of current bid")
				console.log(curBet.value)
				console.log("quantity of user bid")
				console.log(data["quantity"])
				console.log("value of user bid")
				console.log(data["value"])
				curBet = {name:data["name"], index:turn, quantity:data["quantity"], value:data["value"]};
				// if (turn != users.length - 1) {
				// 	turn = turn + 1;
				// }
				// else {
				// 	turn = 0;
				// }
				turn = (turn+1)%(users.length);
				io.sockets.emit('place_bet_to_client', {name:data["name"], quantity:data["quantity"], value:data["value"], valid:true, newTurn:users[turn].name});
			}
			else if (parseInt(data["quantity"]) == curBet.quantity && parseInt(data["value"]) > curBet.value) {
				curBet = {name:data["name"], index:turn, quantity:data["quantity"], value:data["value"]};
				// if (turn != users.length - 1) {
				// 	turn = turn + 1;
				// }
				// else {
				// 	turn = 0;
				// }
				turn = (turn+1)%(users.length);
				io.sockets.emit('place_bet_to_client', {name:data["name"], quantity:data["quantity"], value:data["value"], valid:true, newTurn:users[turn].name});

			}
			else {
				console.log("here1")
				console.log("quantity of current bid")
				console.log(curBet.quantity)
				console.log("value of current bid")
				console.log(curBet.value)
				console.log("quantity of user bid")
				console.log(data["quantity"])
				console.log("value of user bid")
				console.log(data["value"])
				io.sockets.emit('place_bet_to_client', {users:users, name:data["name"], quantity:data["quantity"], value:data["value"], valid:false, newTurn:""});
			}
		}
	});

	socket.on('call_fluff_to_server', function(data) {
		let pBet = users[curBet.index].name;
		let pBetIndex = curBet.index;
		let pFluff = data["name"];
		let pFluffIndex = nameToIndex(pFluff);
		let eliminated = "";
		let loss = "";
		let lossAmmount = 0;
		let winner = "";
		if (pBet != pFluff) {
			let trueCount = getDiceCount(curBet.value);
			console.log("trueCount")
			console.log(trueCount)
			console.log("curBet.quantity")
			console.log(curBet.quantity)
			if (curBet.quantity <= trueCount) {
				console.log("person called fluff loses")
				loss = users[pFluffIndex].name;
				console.log("difference")
				console.log(pFluffIndex - pBetIndex);
				if (pFluffIndex - pBetIndex == 1 || pFluffIndex - pBetIndex == (-1)*users.length+1) {
					users[pFluffIndex].numDice--;
					lossAmmount = 1;
				}
				else {
					users[pFluffIndex].numDice = users[pFluffIndex].numDice - 2;
					lossAmmount = 2;
				}
				if (users[pFluffIndex].numDice < 1) {
					eliminated = loss;
					users.splice(pFluffIndex, 1);
				}
			}
			else {
				console.log("person that bet too high lost")
				loss = users[pBetIndex].name;
				users[pBetIndex].numDice--;
				lossAmmount = 1;
				if (users[pBetIndex].numDice < 1) {
					eliminated = loss;
					users.splice(pBetIndex, 1);
				}
			}
			if (users.length == 1) {
				winner = users[0].name;
				gameOn = false;
			}
			rollReady = true;
			let curBetCopy = curBet;
			curBet = {name:"", index: 0, quantity:0, value:0};
			io.sockets.emit('call_fluff_to_client', {winner:winner, admin:admin, pFluff:pFluff, pBet:pBet, loss:loss, lossAmmount:lossAmmount, eliminated:eliminated, curBet:curBetCopy, trueCount:trueCount});
		}
	});
 	socket.on('kick_to_server', function(data){
		if(admin==data["name"]){ 
	    	let i= nameToIndex(data["kickName"]);
			if(i==-1) {
				console.log("name not found")
			}
			else {
				let isTurn = false;
				if (turn == i) {
					isTurn = true;
					turn = (turn+1)%(users.length);
					
				}
				console.log("turn:");
				console.log(turn);
				users.splice(i,1);
				io.sockets.emit('kick_to_client',{kickName:data["kickName"], isTurn:isTurn, next:users[turn].name});
			}
	  	}
	});
})