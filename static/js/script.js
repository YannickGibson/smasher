function lerp(min, max, val){
    return min + (max - min) * val;
}
const deadTextStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 35,
    fill: ['#fe4422'],
    stroke: '#4a1850',
    fontWeight: 'bold',
    strokeThickness: 2,
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
let isCameraShaking = false;
let shakeCamTime = 0;
const maxShakeCamTime = 20;
const maxShakeCamIntensity = 300;
let shakeCamIntensity = maxShakeCamIntensity;

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

const deathText = new PIXI.Text("", deadTextStyle);
deathText.alpha = 0;
deathText.anchor.set(0.5);
container.addChild(deathText);

const minimapContainer = new PIXI.Container();
minimapContainer.position.x = window.innerWidth - 80;
minimapContainer.position.y = window.innerHeight - 80;
minimapContainer.alpha = 0;
app.stage.addChild(minimapContainer);

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


scoreBoardContainer =  new PIXI.Container();
scoreBoardContainer.position.x = window.innerWidth - 270;
scoreBoardContainer.position.y = 20;
scoreBoardContainer.alpha = 0; // Make it invisible on load
app.stage.addChild(scoreBoardContainer);


let overlay = document.getElementById("overlay");

var car; 
var otherCars = {};
var food = {}
let vanishingFood = []
let scoreBoard = new ScoreBoard(scoreBoardContainer);
let scoreBoardInfo = {};
let bestPlayerPos = [null, null];

let inGame = false;

let isTurningRight = false;
let isTurningLeft = false;
let isGoingForward = false;
let isGoingBackward = false;

socket.on("join", initData =>{
    car = new Car(container, 
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
            car.acc = -1;
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
        

        const scaleXY = lerp(container.scale.x, 1, 0.01);
        container.scale.set(scaleXY, scaleXY);

        car.move(delta);

        // GUI
        playerPoint.x = car.x / MAP_SIDE * 56;
        playerPoint.y = car.y / MAP_SIDE * 56;

        bestPlayerPoint.x = bestPlayerPos[0] / MAP_SIDE * 56;
        bestPlayerPoint.y = bestPlayerPos[1] / MAP_SIDE * 56;

        container.scale.set(1 - car.score/2000,1 - car.score/2000);
        //Score Board
        scoreBoard.updateBoard(scoreBoardInfo, car, socket.id);
        


        myData = {
            x: car.x,
            y: car.y,
            rot: car.rotation
        }
        socket.emit("myCar", myData);

        for ( id in otherCars) {
            if(car.dead == false )
            {
                
                if(otherCars[id].doesKill(car))
                {
                    socket.emit("i died", id);
                }
                else if (car.doesKill(otherCars[id]))
                {
                    car.dead = true;
                    console.log("kill");
                    socket.emit("kill", id);
                    shakeCam();
                }
            }
            //otherCars[i].move(delta);
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

                console.log("Ham");
                socket.emit("eat", foodId);
            }
        }
        for (i in foodIdsToDel){
            delete food[foodIdsToDel[i]];
        }

        for (i in vanishingFood)
        {
            if (vanishingFood[i].sprite.scale.x < 0.1){
                console.log("Food Vanished!");
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
            if (otherCars.hasOwnProperty(id)){
                locCar = otherCars[id];
                // Set angle first, because angle depends on positions of car components!!! (been solving this for ~1 hour)
                locCar["rotation"] = lerp(locCar['rotation'], receiveCarData['rot'], 0.2);
                locCar.setPos(
                    lerp(locCar.x, receiveCarData['x'], 0.2),
                    lerp(locCar.y, receiveCarData['y'], 0.2)
                );
                locCar.updateScore(receiveCarData['score']);
            }
            else{//new car
                const newCar = new Car(
                    container,
                    receiveCarData['x'],
                    receiveCarData['y'],
                    receiveCarData['rot'],
                    receiveCarData['color'],
                    receiveCarData['name'],
                    receiveCarData['score']
                );
                otherCars[id] = newCar;// Add car to dictionary
                //console.log("New Car has been added");
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


socket.on("killed", (data)=>{

    inGame = false;
    console.log("you died");
    shakeCam();

    deathText.text =  "You were killed by " + data.killer;
    deathText.x = car.x;
    deathText.y = car.y + car.height/2 ;
    
    car.wipe();
    delete car;
    let i = 0;
    const t = setInterval(()=>
    {
        if (i>33)
        {
            console.log("hi1");
            console.log("cleared: " + i);
            clearInterval(t);
            stopCameraShake();//force stop camera shaking

            deathText.alpha = 0;
            scoreBoardContainer.alpha = 0;
            minimapContainer.alpha = 0;

            overlay.style.display = "flex";
            console.log("hi2");
            return;
        }
        deathText.alpha = lerp(deathText.alpha, 1, 0.2);
        deathText.scale.x = lerp(deathText.scale.x, 1.3, 0.2);
        deathText.scale.y = lerp(deathText.scale.y, 1.3, 0.2);
        i++;
    },30)
});


document.onkeydown = e => {
    if (!inGame){
        return
    }
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
    }
}

document.onkeyup = e => {
    if (!inGame){
        return
    }
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