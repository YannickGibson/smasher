function lerp(min, max, val){
    return min + (max - min) * val;
}
function inverseLerp(a, b, x){
    return (x - a) / (b - a)
}

const deathTextStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 35,
    fill: ['#fe4422'],
    stroke: '#4a1850',
    fontWeight: 'bold',
    strokeThickness: 2,
});

const killCountStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 25,
    fill: ['#000'],
    stroke: '#4a1850',
    strokeThickness: 1,
});

const victimStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 30,
    fill: ['#60ff60'],
    stroke: '#00c200',
    strokeThickness: 1,
});

const fpsStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 10,
    fill: ['#000000']
});

function moveCamera(){
    container.pivot.x = lerp(container.pivot.x, car.x, 0.2);
    container.pivot.y = lerp(container.pivot.y, car.y, 0.2);
}
function _shakeCamera(time){
    if (shakeCamTime > maxShakeCamTime){
        stopCameraShake();
        return
    }
    shakeCamTime += time;
    
    shakeCamIntensity = lerp(shakeCamIntensity, 0, 0.1);

    container.pivot.x = lerp(container.pivot.x, car.x - shakeCamIntensity + (shakeCamIntensity * 2) * Math.random(), 0.2);
    container.pivot.y = lerp(container.pivot.y, car.y - shakeCamIntensity + (shakeCamIntensity * 2) * Math.random(), 0.2);
}
function shakeCam(){
    isCameraShaking = true;
}
function stopCameraShake(){
    isCameraShaking = false;
    shakeCamTime = 0 ;
    shakeCamIntensity = maxShakeCamIntensity;
}

PIXI.utils.skipHello();


let isCameraShaking = false;
let shakeCamTime = 0;
const maxShakeCamTime = 20;
const maxShakeCamIntensity = 300;
let shakeCamIntensity = maxShakeCamIntensity;
const MAX_BOOSTBAR_WIDTH = 100;


var socket = io({transports: ['websocket']});
var app = new PIXI.Application({
    autoResize: true, 
    width: window.innerWidth,
    height: window.innerHeight, 
    backgroundColor: 0x1099bb, 
    resolution: window.devicePixelRatio || 1,
});


document.body.appendChild(app.view);


const container = new PIXI.Container();
app.stage.addChild(container);
container.position.x = app.screen.width/2;
container.position.y = app.screen.height/2;
container.scale.set(0.5, 0.5);


const back = PIXI.Sprite.from('static/images/background/basic.png');
back.x = 0;
back.y = 0;
back.scale.x = 10;
back.scale.y = 10;
back.anchor.set(0.5);
container.addChild(back);





//
// GUI
//

const guiContainer = new PIXI.Container();
app.stage.addChild(guiContainer);


const minimapContainer = new PIXI.Container();
minimapContainer.position.x = window.innerWidth - 80;
minimapContainer.position.y = window.innerHeight - 80;
minimapContainer.alpha = 0;
guiContainer.addChild(minimapContainer);

const minimap = PIXI.Sprite.from('static/images/gui/minimap.png');
minimap.x = 0
minimap.y = 0;
minimap.anchor.set(0.5);
minimapContainer.addChild(minimap);
minimap.alpha = 0.7;

const playerPoint = PIXI.Sprite.from('static/images/gui/playerPoint.png');
playerPoint.anchor.set(0.5);
minimapContainer.addChild(playerPoint);

const bestPlayerPoint = PIXI.Sprite.from('static/images/gui/playerPoint.png');
bestPlayerPoint.anchor.set(0.5);
bestPlayerPoint.tint = "0x000000";
minimapContainer.addChild(bestPlayerPoint);


const scoreBoardContainer =  new PIXI.Container();
scoreBoardContainer.position.x = window.innerWidth - 270;
scoreBoardContainer.position.y = 20;
scoreBoardContainer.alpha = 0; // Make it invisible on load
guiContainer.addChild(scoreBoardContainer);


const killCountContainer =  new PIXI.Container();
killCountContainer.position.x = 10;
killCountContainer.position.y = 30;
killCountContainer.alpha = 1; // Make it invisible on load
guiContainer.addChild(killCountContainer);

const killCountImg = new PIXI.Sprite.from('static/images/gui/killcount.png');
killCountImg.anchor.set(0, 0.5);
killCountImg.scale.set(0.5,0.5);
killCountContainer.addChild(killCountImg);

const killCountText = new PIXI.Text("", killCountStyle);
killCountText.anchor.set(0, 0.5);
killCountText.x = 40;
killCountText.y = 0;
killCountContainer.addChild(killCountText);

const victimText = new PIXI.Text("", victimStyle);
victimText.anchor.set(0.5, 0.5);
victimText.x = window.innerWidth / 2;
victimText.y = window.innerHeight / 2 - 200;
guiContainer.addChild(victimText);

const deathText = new PIXI.Text("Hello", deathTextStyle);
deathText.anchor.set(0.5);
deathText.x = window.innerWidth / 2;
deathText.y = window.innerHeight / 2 + 150;
deathText.alpha = 0;
guiContainer.addChild(deathText);


boostContainer =  new PIXI.Container();
boostContainer.position.x = window.innerWidth/2;
boostContainer.position.y = window.innerHeight - 40;
guiContainer.addChild(boostContainer);

const boostBack = new PIXI.Sprite.from('static/images/gui/minimap.png');
boostBack.x = -MAX_BOOSTBAR_WIDTH/2;
boostBack.width = MAX_BOOSTBAR_WIDTH;
boostBack.height = 20;
boostBack.tint = "0x000000";
boostBack.alpha = 0.2;
boostContainer.addChild(boostBack);

const boostCharge = new PIXI.Sprite.from('static/images/gui/minimap.png');
boostCharge.x = -MAX_BOOSTBAR_WIDTH/2;
boostCharge.width = MAX_BOOSTBAR_WIDTH;
boostCharge.height = 20;
boostCharge.tint = "0x000000";
boostCharge.alpha = 0.5;
boostContainer.addChild(boostCharge);


const fpsText = new PIXI.Text("fps: 60", fpsStyle);
fpsText.x = 10;
fpsText.y = window.innerHeight - 20;
guiContainer.addChild(fpsText);
//
// End GUI
//




let overlay = document.getElementById("overlay");

var car; 
var otherCars = {};
var food = {}
let vanishingFood = []
let scoreBoard = new ScoreBoard(scoreBoardContainer);
let scoreBoardInfo = {};
let bestPlayerPos = [null, null];
let particles = [];

let inGame = false;
let killCount = 0;
let boostChargePercentage = 1;
let boostIsEnabled = true;

// Inputs
let isTurningRight = false;
let isTurningLeft = false;
let isGoingForward = false;
let isGoingBackward = false;
let isPressingEnter = false;

socket.on("join", initData =>{
    car = new Car(container,
        particles,
        initData.x,
        initData.y,
        initData.rot,
        initData.color,
        initData.name,
        initData.score
    )
    overlay.style.display = "none";
    inGame = true;
    playerPoint.tint = initData.color;
    console.log("joining...");
    scoreBoardContainer.alpha = 1;
    minimapContainer.alpha = 1;
    killCountText.text = "0";
    killCount = 0;

    isTurningRight = false;
    isTurningLeft = false;
    isGoingForward = false;
    isGoingBackward = false;
});


// Listen for animate update
app.ticker.add((delta) => {
    // use delta to create frame-independent transform
    if (inGame){

        //Acceleration
        if (isGoingForward && isGoingBackward){
            car.acc = 0;
        }
        else if (isGoingForward){
            car.acc = 1;
        }
        else if (isGoingBackward){
            car.acc = -.7;
        }
        else{
            car.acc = 0;
        }

        // Turning 
        if (isTurningLeft && isTurningRight){
            car.turn = 0;
        }
        else if (isTurningLeft){
            car.turn = -1;
        }
        else if (isTurningRight){
            car.turn = 1;
        }
        else{
            car.turn = 0;
        }
        
        fpsText.text = "fps: " + parseInt(delta*60);

        const scaleXY = lerp(container.scale.x, 1, 0.01);
        container.scale.set(scaleXY, scaleXY);


        if (isPressingEnter && boostIsEnabled)
        {
            car.boostOn();
            boostChargePercentage -= 0.02 * delta;
            if (boostChargePercentage <= 0 )
            {
                boostChargePercentage = 0;
                car.boostOff();
                boostIsEnabled = false;
            }
            boostCharge.width = boostChargePercentage * MAX_BOOSTBAR_WIDTH;
        }
        else if (boostChargePercentage<1)
        {
           boostChargePercentage += 0.008 * delta;
           if (boostChargePercentage >= 1 ){
               boostChargePercentage = 1;
           }
           boostCharge.width = boostChargePercentage * MAX_BOOSTBAR_WIDTH;
        }
        
        car.move(delta);
        car.updateTurboEmit(delta);

        
        // GUI
        playerPoint.x = car.x / MAP_SIDE * 56;
        playerPoint.y = car.y / MAP_SIDE * 56;

        bestPlayerPoint.x = bestPlayerPos[0] / MAP_SIDE * 56;
        bestPlayerPoint.y = bestPlayerPos[1] / MAP_SIDE * 56;

        container.scale.set(1 - car.score/2000,1 - car.score/2000);
        //Score Board
        scoreBoard.updateBoard(scoreBoardInfo, car, socket.id);
        


        myData = {
            x: parseInt(car.x),
            y: parseInt(car.y),
            rot: car.rotation,
            boost: isPressingEnter,
            acc: car.acc
        }
        socket.emit("myCar", myData);

        for ( id in otherCars) {
            otherCars[id].move(delta);
            if(car.dead == false)
            {
                if(otherCars[id].doesKill(car))
                {
                    socket.emit("i died", id);
                }
                else if (car.doesKill(otherCars[id]))
                {
                    car.dead = true;
                    socket.emit("kill", id);
                }
            }
            //first need to set acc, rotate
        }
        let foodIdsToDel = []
        for (foodId in food){
            if (
                food[foodId].isBeingDigested == false &&
                car.doesEat(food[foodId])
            )
            {

                 // so we cannot emit 5x times instead of 1x cause we wait for heartbeat
                 // cuz hertbeat will send us the food back anyways cause of the delay
                food[foodId].isBeingDigested = true;

                vanishingFood.push(food[foodId]);

                //console.log("Ham");
                socket.emit("eat", foodId);
            }
        }
        for (i in foodIdsToDel){
            delete food[foodIdsToDel[i]];
        }

        for (i in vanishingFood)
        {
            if (vanishingFood[i].sprite.scale.x < 0.1){
                //console.log("Food Vanished!");
                vanishingFood[i].wipe();
                vanishingFood.splice(i,1);
            }
            else{
                const newScale = lerp(vanishingFood[i].sprite.scale.x, 0, 0.2); 
                vanishingFood[i].sprite.scale.set(newScale, newScale);
            }
            
        }
    }
    else{//Not in game
        const scaleXY = lerp(container.scale.x, 0.5,0.1);
        container.scale.set(scaleXY, scaleXY);
    }
    for (i in otherCars){
        otherCars[i].updateTurboEmit(delta);
    }
    for (let i = particles.length - 1; i >= 0; i--) 
    {
        particles[i].update();
        
        if (particles[i].finished())
        {
            particles[i].wipe(container);
            particles.splice(i, 1);
        }
    }


    if (car != null){//camera follows car only if car exists :D

        if (isCameraShaking){
            _shakeCamera(delta);
        }
        else if (container != null){
            moveCamera();
        }
    }


});



socket.on('heartBeat', (data)=> {
    othersData = data["cars"];
    for (id in othersData)
    {
        const receiveCarData = othersData[id]
        if (id != socket.id){
            let locCar; 
            if (otherCars.hasOwnProperty(id)){
                locCar = otherCars[id];
                // Set angle first, because angle depends on positions of car components!!! (been solving this for ~1 hour)
                locCar["rotation"] = lerp(locCar['rotation'], receiveCarData['rot'], 0.2);
                locCar.setPos(
                    lerp(locCar.x, receiveCarData['x'], 0.2),
                    lerp(locCar.y, receiveCarData['y'], 0.2)
                );
            }
            else{//new car
                locCar = new Car(
                    container,
                    particles,
                    receiveCarData['x'],
                    receiveCarData['y'],
                    receiveCarData['rot'],
                    receiveCarData['color'],
                    receiveCarData['name'],
                    receiveCarData['score']
                );
                otherCars[id] = locCar;// Add car to dictionary
                //console.log("New Car has been added");
            }

            locCar.updateScore(receiveCarData['score']);
            locCar.acc = receiveCarData['acc'];

            if (receiveCarData['boost'])
            {
                locCar.boostOn();
            } 
            else
            {
                locCar.boostOff();
            } 
        }
    }
    for (localId in otherCars){
        if ( !othersData.hasOwnProperty(localId) ){
            //console.log("Car has been deleted");
            otherCars[localId].wipe();
            delete otherCars[localId];
        }
    }
    info = data['info'];
    // We can also say: if player score is present scoreboard is too
    if ( info.hasOwnProperty('score'))
    {
        if (info['score'] !== car.score)
        {
            car.updateScore(info['score']);
        }

        scoreBoardInfo = info['scoreBoard'];

        bestPlayerPos = info['bestPlayerPos'];

    }

    foodData = data["food"];
    // Food addition
    for (foodId in foodData){
        if ( !food.hasOwnProperty(foodId) ){
            const _x = foodData[foodId].x,
            _y = foodData[foodId].y,
            _color = foodData[foodId].color;
            const newFood = new Food(container, _x, _y, _color);
            food[foodId] = newFood;
            //console.log("New Food!");
        }
    }
    // Food deletion
            
    if(foodData != null ){// foodData != null ---- if its not empty !! or i get Error

        for (localFoodId in food){
            if (!foodData.hasOwnProperty(localFoodId) )
            {
                food[localFoodId].wipe()
                delete food[localFoodId];
            }
        }
    }

    

    
});

function iKilled(data)
{
     console.log("kill auth");
     killCountText.text = ++killCount;
     shakeCam();
     displayVictimText(data['dead']);
}
function displayVictimText(name){
    victimText.alpha = 1;
    victimText.text = "You have smashed " + name;
    fadeStrength = 0.001;
    let t = setInterval(()=>
    {
        victimText.alpha -= fadeStrength;
        fadeStrength += 0.001;
        if (victimText.alpha <= 0.1)
        {
            victimText.alpha = 0;
            clearInterval(t);
        }

    }, 30)
}

socket.on("u killed", iKilled);

socket.on("dead", (data)=>{

    inGame = false;
    console.log("you died");
    shakeCam();

    deathText.text =  "You were killed by " + data.killer;
    
    // Delete car
    car.wipe();
    delete car;

    let i = 0;
    const t = setInterval(()=>
    {
        if (i>33)
        {

            deathText.alpha = 0;
            scoreBoardContainer.alpha = 0;
            minimapContainer.alpha = 0;

            overlay.style.display = "flex";

            stopCameraShake();//force stop camera shaking

            clearInterval(t);
            return;
        }
        deathText.alpha = lerp(deathText.alpha, 1, 0.2);
        deathText.scale.x = lerp(deathText.scale.x, 1.3, 0.2);
        deathText.scale.y = lerp(deathText.scale.y, 1.3, 0.2);
        i++;
    },30)
});


document.onkeydown = e => 
{/* 
    if (!inGame){
        return
    } */
    switch (e.keyCode) 
    { 
        case 38: // UP
        case 87: // W
            isGoingForward = true;
            break;

        case 40: // DOWN
        case 83: // S
            isGoingBackward = true;
            break;

        case 37: // LEFT
        case 65: // A
            isTurningLeft = true;
            break;

        case 39: // RIGHT
        case 68: // D
            isTurningRight = true;
            break;

        case 32: // Space
            isPressingEnter = true;
            break;

        // Testing
        case 101: // Num 5
            iKilled( { "dead": "Bobby" });
            break;
    }
}

document.onkeyup = e => 
{/* 
    if (!inGame){
        return
    } */
    switch (e.keyCode) 
    {
        case 38: // UP
        case 87: // W
            isGoingForward = false;
            break;

        case 40: // DOWN
        case 83: // S
            isGoingBackward = false;
            break;

        case 37: // LEFT
        case 65: // A
            isTurningLeft = false;
            break;

        case 39: // RIGHT
        case 68: // D
            isTurningRight = false;
            break;
            
        case 32: // Space
            isPressingEnter = false;
            car.boostOff();
            boostIsEnabled = true;
            break;

    }
}

// Move container to the center
container.x = app.screen.width / 2;
container.y = app.screen.height / 2;

// Center bunny sprite in local container coordinates
container.pivot.x = container.width / 2;
container.pivot.y = container.height / 2;




// Resize function window
window.addEventListener('resize', resize);
function resize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
}
resize();

$(document).ready(()=>{
    $("#nameButton").click(()=>{
        $name = $("#name-input").val();
        socket.emit("join", {name: $name});
    });
    $('#name-input').keypress( (e) => {
        if (e.which == 13) {
            $("#nameButton").click();
        }
      });

});