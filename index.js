var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var fs = require('fs')
var path = require('path')
var http = require('http').Server(app)
var io = require('socket.io')(http)

/////////////////////////////////////////////////////////////////
//This fixed the issue with long disconnecting times in browsers
//The interval checks if player is connected every 1 seconds
//If the player is disconnected for 5 second, they get booted
/////////////////////////////////////////////////////////////////
io.set('heartbeat interval', 1000);
io.set('heartbeat timeout', 5000);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
	extended: true
}))
app.use(bodyParser.json())

/////////////////////////////////
//There are 3 game type options//
//-random					   //
//-createPrivate			   //
//-joinPrivate				   //
/////////////////////////////////

var gameType;
function getGameType(gameQuery){
	for (key in gameQuery){
		gameType = key.toString()
	}
}

app.get('/join', function(req, res){
	res.sendFile(__dirname + '/views/join.html')
})

app.get('/game', function(req, res){
	gameQuery = req.query
	getGameType(gameQuery)
	res.sendFile(__dirname + '/views/game.html')
})


app.get('/', function(req, res){
	res.sendFile(__dirname + '/views/index.html')
})

function getRandomInt(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

//This sets the combination of what letter each player will get
function assignLetter(){
	number = getRandomInt(0, 1)
	if (number == 0){
		players = ["X", "O"]
	}else if (number == 1){
		players = ["O", "X"]
	}
	return players
}

//This sets the combination of who will start the game
function assignTurn(){
	number = getRandomInt(0, 1)
	if (number == 0){
		turn = [true, false]
	}else if (number == 1){
		turn = [false, true]
	}
	return turn
}

//This is when you don't have the playerData and you only have the player Id.
//This returns the whole player data when only the playerId is available
function findOtherPlayer(playerId){
	for (var room in gameRooms){
		for (var i = 0; i < gameRooms[room].length; i++){
			gameRooms[room][i].id
			if (playerId == gameRooms[room][i].id){
				return gameRooms[room][i]
			}
		}
	}
}

//This is when you have the playerData
function getOtherPlayer(player){
	var playerData = gameRooms[player.roomId]
	
	//console.log("\nGame Rooms:")
	//console.log(gameRooms)
	
	//console.log("\nRoom ID:")
	//console.log(player.roomId)
	
	var otherPlayer;
	
	if (playerData[0].playerNumber == player.playerNumber){
		otherPlayer = playerData[1]
	}else if (playerData[1].playerNumber == player.playerNumber){
		otherPlayer = playerData[0]
	}
	
	return otherPlayer
}

function findPlayerRoom(playerId){
	for (var room in gameRooms){
		for (var i = 0; i < gameRooms[room].length; i++){
			gameRooms[room][i].id
			if (playerId == gameRooms[room][i].id){
				return room
			}
		}
	}
	
	//This means the player does not have a room
	return false
}

//This is used to switch who starts the game at every new game
function randomizePlayerTurn(playerData){
	turn = assignTurn()
	
	playerData[0].turn = turn[0]
	playerData[1].turn = turn[1]
	
	return playerData
}

function getRoomId(){
	return getRandomInt(1, 10000)
}

function initStartValues(){
	letters = assignLetter()
	turn = assignTurn()
	playerData = []
	usersOn = 1
	roomId = getRoomId()
	
	valueList = {
		letters: letters,
		turn: turn,
		playerData: playerData,
		usersOn: usersOn,
		roomId: roomId,
	}
	
	return valueList
	
}

function removePlayerFromRoom(playerId){
	for (var i = 0; i < playerData.length; i++){
		if (playerId == playerData[i].id){
			playerData.splice(i, 1)
			return
		}
	}
}

randomGame = initStartValues()

gameRooms = {}

io.on('connection', function(socket){
	//console.log("\nConnection")
		
	if (gameType == "random"){
		var joinInfo = {
			id: socket.id,
			roomId: randomGame.roomId,
			playerNumber: randomGame.usersOn,
			letter: randomGame.letters[(randomGame.usersOn - 1)],
			turn: randomGame.turn[randomGame.usersOn - 1],
			roomType: "random",
		}
				
		randomGame.playerData.push(joinInfo)
		
		randomGame.usersOn ++
		
		socket.emit("playersJoined", joinInfo)
		
		if (randomGame.usersOn > 2){
			gameRooms[randomGame.roomId] = randomGame.playerData
			io.to(randomGame.playerData[0].id).emit("gameStart")
			io.to(randomGame.playerData[1].id).emit("gameStart")
			randomGame = initStartValues()
		}
		
	}else if (gameType == "createPrivate"){
		var privateGame = initStartValues()
		var joinInfo = {
			id: socket.id,
			roomId: privateGame.roomId,
			playerNumber: privateGame.usersOn,
			letter: privateGame.letters[(privateGame.usersOn - 1)],
			turn: privateGame.turn[privateGame.usersOn - 1],
			roomType: "private",
			gameValues: privateGame,
		}
		socket.emit("playersJoined", joinInfo)
		
		gameRooms[privateGame.roomId] = [joinInfo]
		
	}else if (gameType == "gameCode"){
		var gameRoomId = Number(gameQuery.gameCode)
		if (gameRooms[gameRoomId] == undefined){
			socket.emit("gameNotExist", gameRoomId)
		}else{
			var gameValues = gameRooms[gameRoomId][0].gameValues
			
			gameValues.usersOn ++
			
			var joinInfo = {
				id: socket.id,
				roomId: gameValues.roomId,
				playerNumber: gameValues.usersOn,
				letter: gameValues.letters[gameValues.usersOn - 1],
				turn: gameValues.turn[gameValues.usersOn - 1],
				roomType: "private",
			}
						
			gameRooms[gameRoomId].push(joinInfo)
			
			socket.emit("playersJoined", joinInfo)
			
			io.to(gameRooms[gameRoomId][0].id).emit("gameStart")
			io.to(gameRooms[gameRoomId][1].id).emit("gameStart")
		}
	}
	
	socket.on("winner", function(player){
		var otherPlayer = getOtherPlayer(player)
		
		io.to(player.id).emit("winnerDetermined", {youWon: true, winningLetter: player.letter})
		io.to(otherPlayer.id).emit("winnerDetermined", {youWon: false, winningLetter: player.letter})
	})
	
	socket.on("tie", function(roomId){
		io.to(gameRooms[roomId][0].id).emit("tie")
		io.to(gameRooms[roomId][1].id).emit("tie")
	})
	
	socket.on("playedMove", function(movePlayed){		
		var otherPlayer = getOtherPlayer(movePlayed.player)
		
		var playerRoom = movePlayed.player.roomId
				
		info = {
			boxPlayed: movePlayed.box,
			letter: movePlayed.player.letter
		}
		io.to(otherPlayer.id).emit("yourTurn", info)
		io.to(movePlayed.player.id).emit("otherTurn")
	})
	
	playersRematch = 0
	
	socket.on("restartGame", function(roomId){
		playersRematch ++
		if (playersRematch == 2){
			newPlayerData = randomizePlayerTurn(gameRooms[roomId])
			io.to(gameRooms[roomId][0].id).emit("gameRestarted", newPlayerData[0])
			io.to(gameRooms[roomId][1].id).emit("gameRestarted", newPlayerData[1])
			playersRematch = 0
		}
	})
	
	//////////////
	//DISCONNECT//
	//////////////
	socket.on('disconnect', function(){
		//console.log("\nDisconnect")
		
		removePlayerFromRoom(socket.id)
				
		//This means the player is alone as he does not have a room
		if (!findPlayerRoom(socket.id)){
			randomGame = initStartValues()
		}else if (!(gameRooms[findPlayerRoom(socket.id)] == undefined)){ 
			if (!(gameRooms[findPlayerRoom(socket.id)].length == 1)){
				
				var otherPlayerInfo = findOtherPlayer(socket.id)
								
				if (otherPlayerInfo != null){
					var otherPlayer = getOtherPlayer(otherPlayerInfo)
					if(otherPlayer){
						io.to(otherPlayer.id).emit("playerDisconnect")
					}
				}
			}
		}
	})
})

//Server configuration stuff

//Tries to find variable for openshift ip, if nothing then loads to localhost
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

//Same as above, but with port
//If you want to load on localhost onto a different port, change 4000 to whatever port you please
var port = process.env.OPENSHIFT_NODEJS_PORT || 4000;

http.listen(port, ipaddress, function(){
	console.log('Running on Openshift Server')
})