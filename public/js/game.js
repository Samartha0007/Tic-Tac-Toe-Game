//Initializes variables
var socket = io();

playerData = null;
yourTurn = null;
canPlay = false;

//////////////////////////////////////////////
//fastclick.js initializer.			   	   //
//This removes delay for mobile button tap//
///////////////////////////////////////////
if ('addEventListener' in document) {
    document.addEventListener('DOMContentLoaded', function() {
        FastClick.attach(document.body);
    }, false);
}

function refreshPage(){
	location.reload()
}

/////////////////////////////////////////////////////////////////////
//This happens initially when player is waiting for someone to join//
/////////////////////////////////////////////////////////////////////

//This rotates the spinny symbol
degreeRotation = 0 
function spinObject(){
	if (document.getElementsByClassName("waitSpinner").length > 0){
		document.getElementsByClassName("waitSpinner")[0].style.transform = "rotate(" + degreeRotation + "deg)"
		document.getElementsByClassName("waitSpinner")[0].style.webkitTransform = "rotate(" + degreeRotation + "deg)"
		document.getElementsByClassName("waitSpinner")[1].style.transform = "rotate(" + degreeRotation + "deg)"
		document.getElementsByClassName("waitSpinner")[1].style.webkitTransform = "rotate(" + degreeRotation + "deg)"
		degreeRotation += 10
	}
}

loop = setInterval(spinObject, 1000/60)

///////////////////////////////////////////
//These functions create various elements//
///////////////////////////////////////////
//This sandwiches text with the spinners
function sandwichWithSpinners(elementId, sandwichText){
	var waitSpinner1 = document.createElement("i")
	var waitSpinner2 = document.createElement("i")
	
	waitSpinner1.setAttribute("class", "waitSpinner fa fa-spinner")
	waitSpinner2.setAttribute("class", "waitSpinner fa fa-spinner")
	
	var waitText = document.createTextNode(sandwichText)
	
	document.getElementById(elementId).innerHTML = ""
	
	document.getElementById(elementId).appendChild(waitSpinner1)
	document.getElementById(elementId).appendChild(waitText)
	document.getElementById(elementId).appendChild(waitSpinner2)
	
	loop = setInterval(spinObject, 1000/60)
}

//Creates a rematch button
function createRematchButton(){	
	var rematchBtn = document.createElement("button")
	
	var rematchText = document.createTextNode("Rematch?")
	
	rematchBtn.appendChild(rematchText)
	rematchBtn.setAttribute("id", "rematchButton")
	rematchBtn.setAttribute("class", "actionBtn btn btn-info")
	rematchBtn.setAttribute("onClick", "restartGame()")
	
	document.getElementById("gameState").appendChild(rematchBtn)
}

//This is the button that is made when opponent leaves to find a new game
function createFindGameButton(){
	var findGame = document.createElement("button")
	findGame.setAttribute("class", "actionBtn btn btn-info")
	findGame.setAttribute("id", "findGameButton")
	findGame.setAttribute("onClick", "refreshPage()")
	
	var findGameText = document.createTextNode("New Game")
	
	findGame.appendChild(findGameText)
	
	document.getElementById("gameState").appendChild(findGame)
}
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////
//These functions deal with reseting the game board when a new game starts//
////////////////////////////////////////////////////////////////////////////
function resetBoxes(){
	for (var i = 1; i < 10; i ++){
		document.getElementById(i.toString()).innerHTML = ""
		document.getElementById(i.toString()).className = "box"
	}	
}
function resetScoreboard(){
	document.getElementById("XScore").innerHTML = "0"
	document.getElementById("tieScore").innerHTML = "0"
	document.getElementById("OScore").innerHTML = "0"
}
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

//This function returns text based on if it is your turn
function checkTurn(){
	var turnText;
	if (yourTurn){
		clearInterval(loop)
		turnText = "Your Turn"
		document.getElementById("turn").innerHTML = turnText
		document.getElementById("turn").className = "yourTurn"
	}else{
		turnText = " Friend's Turn "
		document.getElementById("turn").className = "notYourTurn"
		sandwichWithSpinners("turn", turnText)
		
	}
}

//////////////////////////////////////////////////////
//These functions deal with start of the game things//
//////////////////////////////////////////////////////
socket.on("connect", function(){
	//Resets boxes to make sure none are already there when page loads
	resetBoxes()
	resetScoreboard()
})

//Gets player info and initializes turn, data and letter
socket.on("playersJoined", function(joinInfo){
	playerData = joinInfo
	if (playerData.roomType == "private"){
		document.getElementById("roomId").innerHTML = "" + joinInfo.roomId
	}
	document.getElementById("player").innerHTML = "Now you are : " + joinInfo.letter
})

function removeSearchAction(){
	document.getElementById("loadingContainer").remove()
}

function removeSearchScreen(){
	document.getElementById("loadingContainer").setAttribute("class", "animated fadeOut")
	clearInterval(loadingLoop)
	setTimeout(removeSearchAction, 1500)
}

function gameStart(){	
	//Stops spinning the spinny things because they go away
	clearInterval(loop)
	
	//This checks if the search screen is there before trying to remove it
	if (document.getElementById("loadingContainer")){
		removeSearchScreen()
	}
	document.getElementById("gameContainer").style.display = "block"
	document.getElementById("gameState").innerHTML = ""
	canPlay = true
	yourTurn = playerData.turn
	checkTurn()
}

//Runs once 2 people have joined
socket.on("gameStart", function(){
	gameStart()
})
//////////////////////////////////////////////////////
//////////////////////////////////////////////////////

function playerDisconnected(text){
	//This clears any spinners if they are running
	clearInterval(loop)
		
	document.getElementById("gameState").innerHTML = text
	
	document.getElementById("turn").innerHTML = ""
	if (playerData.roomType == "random"){
		createFindGameButton()
	}
	canPlay = false
}

socket.on("gameNotExist", function(roomId){
	document.getElementById("searchState").innerHTML = "Room " + roomId + "Not Exist."
})

//Runs when other player disconnected
socket.on("playerDisconnect", function(){
	playerDisconnected("Friend Disconnected")
})

function restartGame(){
	document.getElementById("rematchButton").remove()
	sandwichWithSpinners("gameState", " Waiting for Friend ")

	var roomId = playerData.roomId
	socket.emit("restartGame", roomId)
}

socket.on("gameRestarted", function(newPlayerData){
	playerData = newPlayerData
	resetBoxes()
	canPlay = true
	gameStart()
})

//Updates the scoreboard based on what letter is entered
function addLetterToScoreboard(letter){
	var newScore = Number(document.getElementById(letter + "Score").innerHTML)
	newScore ++
	document.getElementById(letter + "Score").innerHTML = newScore
}

//Initializes things when the game ends
function endGameInit(){
	document.getElementById("turn").innerHTML = ""
	createRematchButton()
	canPlay = false
}

socket.on("winnerDetermined", function(winner){
	if (winner.youWon){
		document.getElementById("gameState").innerHTML = "You Won!"
	}else{
		document.getElementById("gameState").innerHTML = "You Lost..."
	}
	
	addLetterToScoreboard(winner.winningLetter)
	
	endGameInit()
})

//Changes class of box based on the letter that is in it
function addClassByLetter(boxId, letter){
	if (letter == "X"){
		document.getElementById(boxId).className += " playerX" 
	}else if (letter == "O"){
		document.getElementById(boxId).className += " playerO"
	}
}

socket.on("tie", function(){
	document.getElementById("gameState").innerHTML = "It's tied !"
	endGameInit()
	addLetterToScoreboard("tie")
})

//Switches turns and checks for winner
socket.on("otherTurn", function(){
	if (checkWinner()){
		socket.emit("winner", playerData)
	}else{
		if (checkTie()){
			socket.emit("tie", playerData.roomId)
		}else{
			yourTurn = false
			checkTurn()
		}
	}
})

//Switches turn to yours and also updates the board after last move
socket.on("yourTurn", function(info){
	document.getElementById(info.boxPlayed).innerHTML = info.letter
	
	addClassByLetter(info.boxPlayed, info.letter)
	
	yourTurn = true
	checkTurn()
})

//This compares any amount of arguments you inputs
function areEqual(){
	var len = arguments.length;
	for (var i = 1; i< len; i++){
		if (arguments[i] == null || arguments[i] == "" || arguments[i] != arguments[i-1]){
			return false;
		}
	}
	return true;
}

function checkTie(){
	isTie = true
	for (var i = 1; i < 10; i ++){
		var box = document.getElementById(i.toString()).innerHTML
		if (box == "" || box == null){
			isTie = false
		}
	}
	return isTie
}

function prepareGameState(){
	boxContent = {}
	for (var i = 1; i < 10; i++){
		boxContent[i] = document.getElementById(i.toString()).innerHTML
	}
	console.log(prepareGameState)
}

function checkWinner(){
	//Gets values of each box in the game
	box1 = document.getElementById("1").innerHTML
	box2 = document.getElementById("2").innerHTML
	box3 = document.getElementById("3").innerHTML
	
	box4 = document.getElementById("4").innerHTML
	box5 = document.getElementById("5").innerHTML
	box6 = document.getElementById("6").innerHTML
	
	box7 = document.getElementById("7").innerHTML
	box8 = document.getElementById("8").innerHTML
	box9 = document.getElementById("9").innerHTML
	
	isWinner = false
	
	//Checks top 3 boxes
	if (areEqual(box1, box2, box3)){
		isWinner = true
	
	//Checks middle 3 boxes
	}else if (areEqual(box4, box5, box6)){
		isWinner = true
	}
	
	//Checks bottom 3 boxes
	else if (areEqual(box7, box8, box9)){
		isWinner = true
	}
	
	//Checks left vertical 3 boxes
	else if (areEqual(box1, box4, box7)){
		isWinner = true
	}
	
	//Checks middle vertical 3 boxes
	else if (areEqual(box2, box5, box8)){
		isWinner = true
	}
	
	//Checks right vertical 3 boxes
	else if (areEqual(box3, box6, box9)){
		isWinner = true
	}
	
	//Checks downward slope diagnol 3 boxes
	else if (areEqual(box1, box5, box9)){
		isWinner = true
	}
	
	//Checks downward slope diagnol 3 boxes
	else if (areEqual(box3, box5, box7)){
		isWinner = true
	}
	
	return isWinner
}

function boxClick(box){
	if (canPlay){
		if (yourTurn){
			if ( document.getElementById(box.id).innerHTML == ""){
				document.getElementById(box.id).innerHTML = playerData.letter
				
				addClassByLetter(box.id, playerData.letter)
				
				movePlayed = {
					player: playerData,
					box: box.id
				}
				
				socket.emit("playedMove", movePlayed)
			}
		}
	}
}