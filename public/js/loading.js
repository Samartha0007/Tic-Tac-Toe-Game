/*
 *This flows the background color when searching for a game 
 */
 function init(){
	loadingLoop = setInterval(flowBgColor, 1000/100)
}

function getRandomInt(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

var redNum = 150
var greenNum = 150
var blueNum = 150

optionList = [redNum, greenNum, blueNum]

var pickNumber = getRandomInt(0, optionList.length-1)

var increase = true

function changeBgColor(number){
	document.getElementById("loadingContainer").style.backgroundColor = "rgba(" + optionList[0] + "," + optionList[1] + "," + optionList[2] + ", 1)"
	
	if (optionList[number] == 255){
		increase = false
	}else if (optionList[number] == 150){
		increase = true
	}

	if (increase){
		if (optionList[number] < 255){
			optionList[number] ++
		}
		
		if (optionList[number] == 255){
			pickNumber = getRandomInt(0, 2)
		}
		
	}else{
		if (optionList[number] > 150){
			optionList[number] --
		}
		
		if (optionList[number] == 150){
			pickNumber = getRandomInt(0, 2)	
		}
	}
}

function flowBgColor(){
	changeBgColor(pickNumber)
}

window.onload = init()