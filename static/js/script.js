
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

window.onblur = function() {
    if (inGame){

        socket.emit("focusout");

        isBoostEnabled = true;
        isPressingEnter = false;
        car.boostOff();
        /* car.acc = 0;

        isGoingForward = false;
        isGoingBackward = false;
        */
    }
    
};

PIXI.utils.skipHello();


let isCameraShaking = false;
let shakeCamTime = 0;
const maxShakeCamTime = 200;
let shakeCamIntensity;
let killShakeIntensity = 300;
let boostShakeIntensity = 50;
const MAX_BOOSTBAR_WIDTH = 100;


var socket = io({transports: ['websocket']});

const RATIO_NORM = 16/9;
const WIDTH_NORM = 1536;
const HEIGHT_NORM = 754;

let appWidth;
let appHeight;



var app = new PIXI.Application(
{
    backgroundColor: 0x1099bb, 
    resolution: window.devicePixelRatio || 1,
    antialias: true
});
app.renderer.view.style.width = 100 + "%";
app.renderer.view.style.height = 100+ "%";
document.body.appendChild(app.view);


const container = new PIXI.Container();
container.scale.set(200, 200);
app.stage.addChild(container);


//
// GANE GUI
//
const killCountContainer =  new PIXI.Container();
killCountContainer.position.x = 10;
killCountContainer.position.y = 30;
app.stage.addChild(killCountContainer);


const killCountText = new PIXI.Text("0", killCountStyle);
killCountText.anchor.set(0, 0.5);
killCountText.x = 40;
killCountText.y = 0;
killCountContainer.addChild(killCountText);


const guiContainer = new PIXI.Container();
app.stage.addChild(guiContainer);


const minimapContainer = new PIXI.Container();
guiContainer.alpha = 0;
guiContainer.addChild(minimapContainer);


const scoreboardContainer =  new PIXI.Container();
scoreboardContainer.position.y = 20;
guiContainer.addChild(scoreboardContainer);


const victimText = new PIXI.Text("", victimStyle);
victimText.anchor.set(0.5, 0.5);
victimText.x = app.screen.width / 2;
victimText.y = app.screen.height / 2 - 200;
guiContainer.addChild(victimText);

const deathText = new PIXI.Text("Hello", deathTextStyle);
deathText.anchor.set(0.5);
deathText.alpha = 0;
guiContainer.addChild(deathText);


boostContainer =  new PIXI.Container();
guiContainer.addChild(boostContainer);


const fpsText = new PIXI.Text("fps: 60", fpsStyle);
fpsText.x = 10;
guiContainer.addChild(fpsText);
//
// End GANE GUI
//




let overlay = document.getElementById("overlay");
let mouseCheckbox = document.getElementById("mouseCheckbox");

var car; 
var otherCars = {};
var food = {}
let vanishingFood = []
let scoreboardInfo = {};
let bestPlayerPos = [null, null];
let particles = [];

let inGame = false;
let killCount = 0;
let boostChargePercentage = 1;
let isBoostEnabled = true;
let mouseControls = true;
let mouseAngle;
let mouseInGame = false; // On game start mouse over triggers, and sets this to true

// Inputs
let isTurningRight = false;
let isTurningLeft = false;
let isGoingForward = false;
let isGoingBackward = false;
let isPressingEnter = false;

const textures = {};
const sounds = {};
PIXI.Loader.shared
    .add("car", "static/images/vehicles/basic.png")
    .add("bumper", 'static/images/bumpers/basic.png')
    .add("lights", 'static/images/lights/basic.png')
    .add("turboParticle", 'static/images/turbos/basic.png')
    .add("food", 'static/images/spawning/food.png')
    .add("scoreboard", 'static/images/gui/scoreboard.png')
    .add("background", 'static/images/background/basic.png')
    .add("minimap", 'static/images/gui/minimap.png')
    .add("whitePixel", 'static/images/gui/white_pixel.png')
    .add("killCountEmoji", 'static/images/gui/kill_count_emoji.png')
    .add("foodSound", 'static/sounds/blop.mp3')
    .add("crashSound", 'static/sounds/crash.mp3')
    .add("boostSound", 'static/sounds/boost.mp3')
;

let scoreboard;
let playerPoint;
let bestPlayerPoint; 
let boostCharge;

PIXI.Loader.shared.onProgress.add((e) => {
    console.log(e.progress + " - " + new Date().getMilliseconds());
});
let loaded = false;
PIXI.Loader.shared.load( (loader, resources) =>
{
    textures.car = resources.car.texture;
    textures.bumper = resources.bumper.texture;
    textures.lights = resources.lights.texture;
    textures.turboParticle = resources.turboParticle.texture;
    textures.food = resources.food.texture;

    scoreboard = new Scoreboard(scoreboardContainer, resources.scoreboard.texture)

    const background = new PIXI.Sprite(resources.background.texture);
    background.x = 0;
    background.y = 0;
    background.scale.x = 10;
    background.scale.y = 10;
    background.anchor.set(0.5);
    container.addChild(background);
    
    const minimap = new PIXI.Sprite(resources.minimap.texture);
    minimap.x = 0
    minimap.y = 0;
    minimap.alpha = 0.7;
    minimap.anchor.set(0.5);
    minimapContainer.addChild(minimap);


    playerPoint = new PIXI.Sprite(resources.whitePixel.texture);
    playerPoint.width = 7;
    playerPoint.height = 7;
    playerPoint.anchor.set(0.5);
    minimapContainer.addChild(playerPoint);

    bestPlayerPoint = new PIXI.Sprite(resources.whitePixel.texture);
    bestPlayerPoint.width = 7;
    bestPlayerPoint.height = 7;
    bestPlayerPoint.tint = "0x000000";
    bestPlayerPoint.anchor.set(0.5);
    minimapContainer.addChild(bestPlayerPoint);

    const killCountImg = new PIXI.Sprite(resources.killCountEmoji.texture);
    killCountImg.anchor.set(0, 0.5);
    killCountImg.scale.set(0.5);
    killCountContainer.addChild(killCountImg);
    
    const boostBack = new PIXI.Sprite(resources.whitePixel.texture);
    boostBack.x = -MAX_BOOSTBAR_WIDTH/2;
    boostBack.y = 0;
    boostBack.width = MAX_BOOSTBAR_WIDTH;
    boostBack.height = 20;
    boostBack.tint = "0x000000";
    boostBack.alpha = 0.2;
    boostContainer.addChild(boostBack);

    boostCharge = new PIXI.Sprite(resources.whitePixel.texture);
    boostCharge.x = -MAX_BOOSTBAR_WIDTH/2;
    boostCharge.y = 0;
    boostCharge.width = MAX_BOOSTBAR_WIDTH;
    boostCharge.height = 20;
    boostCharge.tint = "0x000000";
    boostCharge.alpha = 0.5;
    boostContainer.addChild(boostCharge);


    //
    ///
    //// SOUNDS
    ///
    //
    PIXI.sound.add('food', resources.foodSound);
    resources.crashSound.volume = 0.07;
    PIXI.sound.add('crash', resources.crashSound);
    
    sounds.boost = resources.boostSound;


    
    // Listen for animate update
    app.ticker.add((delta) => {
    // use delta to create frame-independent transform
    if (inGame){


        if (mouseControls )
        {
            let myRot = car.rotation % (Math.PI * 2);

            // If -10 => 350 PS: Python modulo would do this by default :P
            if (myRot < 0)
            {
                myRot += Math.PI * 2;
            }

            //console.log(myRot * (180/Math.PI), mouseAngle * (180/Math.PI));
            const deadSpace = radians(10)
            if( Math.abs(myRot - mouseAngle) > deadSpace )
            {
                if ( (mouseAngle - myRot < Math.PI && mouseAngle > myRot) || (myRot - mouseAngle > Math.PI  && myRot > mouseAngle) )
                {
                    car.turn = 1;
                }
                else if ( (myRot - mouseAngle < Math.PI && mouseAngle < myRot) || (mouseAngle - myRot > Math.PI  && myRot < mouseAngle) )
                {
                    car.turn = -1;
                }
            }
            else{
                car.turn = 0;
            }
        }
        else
        {
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
        }


        fpsText.text = "fps: " + parseInt(delta*60);

       /*  const scaleXY = lerp(container.scale.x, 1, 0.01);

        container.scale.set(scaleXY); */


        if (isPressingEnter && isBoostEnabled)
        {
            car.boostOn();

            boostChargePercentage -= 0.02 * delta;
            if (boostChargePercentage <= 0 )
            {
                boostChargePercentage = 0;
                car.boostOff();
                stopCameraShake();
                isBoostEnabled = false;
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
        playerPoint.x = car.x / Car.MAP_SIDE * 56;
        playerPoint.y = car.y / Car.MAP_SIDE * 56;

        bestPlayerPoint.x = bestPlayerPos[0] / Car.MAP_SIDE * 56;
        bestPlayerPoint.y = bestPlayerPos[1] / Car.MAP_SIDE * 56;
        //car.score/2000
        container.scale.set(1- constrain(car.score/4000 ,0 , 0.5) );
        //Score Board
        scoreboard.updateBoard(scoreboardInfo, car, socket.id);
        


        myData = {
            x: parseInt(car.x),
            y: parseInt(car.y),
            rot: car.rotation,
            boost: isBoostEnabled && isPressingEnter,
            acc: car.acc,
            turn: car.turn
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

                // So we cannot emit 5x times instead of 1x cause we wait for heartbeat
                // Cuz hertbeat will send us the food back anyways cause of the delay
                food[foodId].isBeingDigested = true;

                vanishingFood.push(food[foodId]);


                PIXI.sound.play("food");
            
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

    
    socket.on('heartBeat', (data)=> 
    {
        othersData = data["cars"];
        for (id in othersData)
        {
            const receiveCarData = othersData[id]
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
            locCar.turn = receiveCarData['turn'];

            if (receiveCarData['boost'])
            {
                locCar.boostOn();
            } 
            else
            {
                locCar.boostOff();
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

            scoreboardInfo = info['scoreboard'];

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
    loaded = true;
});



function calcScreenSize(){

}
function scalarProduct(vect1, vect2){
    return (vect1[0] * vect2[0]) + (vect1[1] * vect2[1]);
}
function scalar(vect1, vect2){
    return (vect1[0] * vect2[1]) - (vect1[1] * vect2[0]);
}
function sub(p1, p2){
    return [p1[0] - p2[0], p1[1] - p2[1]];
}
function div(p1, p2){
    if (p2[1] == 0){
        return 0;
    }
    return (p1[0] / p2[0], p1[1] / p2[1]);
}
function mult(p1, p2){
    return (p1[0] * p2[0], p1[1] * p2[1]);
}
function add(p1, p2){
    return [p1[0] + p2[0], p1[1] + p2[1]];
}
function radians(deg){
    return deg * (Math.PI/180);
}
function lerp(min, max, val){
    return min + (max - min) * val;
}
function constrain(val, min, max){
    if (val < min){
        return min;
    }
    else if (val > max){
        return max;
    }
    else{
        return val;
    }
}

//
///
//////
///////// START CAR
//////
///
//

class Car
{
    static MAP_SIDE = 512*5//image-size*(scale/2) ##idk why divided by 2 
    static MAX_BUMPER_SCALE = 6;
    static NORMAL_SPEED = 0.8;
    static BOOST_SPEED = 1.8;
    static TURN_SPEED = 0.1;
    static SCORE_TEXT_Y_OFFSET = 30;
    static MAX_BODY_SCALE = 4;
        
    static nameStyle = new PIXI.TextStyle({
        fontFamily: 'Montserrat',
        fontSize: 20,
        fill: ['#ffffff']
    });

    static getVertices(spriteObject){
        const vectTL = [- spriteObject.width/2, - spriteObject.height/2]; // vect from center to Top Left not rotated
        const vectTR = [ -vectTL[0], vectTL[1] ];
        const vectBR = [ -vectTL[0], -vectTL[1] ];
        const vectBL = [ vectTL[0], -vectTL[1] ];
        

        //current COS & SIN
        const s = Math.sin(spriteObject.rotation);
        const c = Math.cos(spriteObject.rotation);

        // rotate point
        const newTL = [vectTL[0] * c - vectTL[1] * s, vectTL[0] * s + vectTL[1] * c];
        const newTR = [vectTR[0] * c - vectTR[1] * s, vectTR[0] * s + vectTR[1] * c];
        const newBR = [vectBR[0] * c - vectBR[1] * s, vectBR[0] * s + vectBR[1] * c];
        const newBL = [vectBL[0] * c - vectBL[1] * s, vectBL[0] * s + vectBL[1] * c];
        
        // translate point relevant to car position
        const topLeft = add(newTL, [spriteObject.x, spriteObject.y]);
        const topRight = add(newTR, [spriteObject.x, spriteObject.y]);
        const bottomLeft = add(newBL, [spriteObject.x, spriteObject.y]);
        const bottomRight = add(newBR, [spriteObject.x, spriteObject.y]);

        return [topLeft, topRight, bottomRight, bottomLeft];

    }
    static cross(a1, a2, b1, b2){
        //vectA = a2 - a1
        const r = [a2[0] - a1[0], a2[1] - a1[1]];
        const s = [b2[0] - b1[0], b2[1] - b1[1]];

        /*
        a2 = a1 + r
        a1 + t*r = b1 + u*s ... / scalar s
        (a1 x s) + t*(r x s) = (b1 x s) + u*(s x s) ... // s x s = 0
        (a1 x s) + t*(r x s) = (b1 x s) ... / (a1 x s)
        t*(r x s) = ((b1 - a1) x s) ... / (r x s)
        t = ((b1 - a1) x s) / (r x s)
        */
       let t = null,  u = null;
        if (scalar(r, s) != 0){
            t = scalar( sub(b1, a1)  , s) / scalar(r, s);
        }
        if (scalar(s, r) != 0){   
            u = scalar( sub(a1, b1)  , r) / scalar(s, r);
        }
        if (t !== null && 0 <= t && t <= 1 && u !== null && 0 <= u && u <= 1){

            return true;
            //point of intersection
            x = a1[0] + r[0]*t;
            y = a1[1] + r[1]*t;
            return [x, y];
        }
        return false;
    }


    constructor(container, particles, x, y, angle, color, name, score)
    {
        this.name = name;
        this.container = container;
        this.speed = 0;
        this.acc = 0;
        this.turn = 0
        this.driftAngle = 0;

        //Create a car
        this.carSprite = new PIXI.Sprite(textures.car);
        this.carSprite.rotation = angle;
        this.carSprite.width = 100;
        this.carSprite.height = 200;
        this.container.addChild(this.carSprite);
        this.carSprite.anchor.set(0.5);
        this.carSprite.tint = color//if color is null, we assign rnd value

        // Create a bumper
        this.bumperSprite = new PIXI.Sprite(textures.bumper);
        this.container.addChild(this.bumperSprite);
        this.bumperSprite.rotation = angle;
        this.bumperSprite.anchor.set(0.5);

        // Create lights
        this.lightsSprite = new PIXI.Sprite(textures.lights);
        this.container.addChild(this.lightsSprite);
        this.lightsSprite.anchor.set(0.5);
        this.lightsSprite.rotation = angle;
        this.lightsSprite.scale.set(0.5, 0.5);
        const sin = Math.sin(this.carSprite.rotation);
        this.lightsSprite.x = x + sin * this.height/2 - sin *20;//offset
        const cos = Math.cos(this.carSprite.rotation);
        this.lightsSprite.y = y - cos * this.height/2 + cos*20;
        
        this.scaleBumper(score);


        
        this.nameText = new PIXI.Text(name, Car.nameStyle);
        this.nameText.x = x;
        this.nameText.y = y + this.height*0.75;
        this.nameText.anchor.set(0.5);
        container.addChild(this.nameText);

        this.scoreText = new PIXI.Text(score, Car.nameStyle);
        this.scoreText.x = x;
        this.scoreText.y = y + this.height*0.75 + Car.SCORE_TEXT_Y_OFFSET;
        this.scoreText.anchor.set(0.5);
        container.addChild(this.scoreText);

        this.accSpeed = Car.NORMAL_SPEED;

        // Sets pos. of all components
        this.setPos(x, y)

        this.xVel = 0;
        this.yVel = 0;

        

        this.turbo = new Turbo(container, color);
        this.boostIsOn = false;
        this.particles = particles;

        this.turboSound = null;
    }
    get width(){
        return this.carSprite.width;
    }
    get height(){
        return this.carSprite.height;
    }
    get x(){
        return this.carSprite.x;
    }
    get y(){
        return this.carSprite.y;
    }
    setPos(x, y){
        this.carSprite.x = x;
        this.carSprite.y = y

        // Sin because we start 0° facing up (it's flipped)
        const sin = Math.sin(this.rotation);
        this.bumperSprite.x = x - sin * this.height/2;
        // Same goes for cos
        const cos = Math.cos(this.rotation);
        this.bumperSprite.y = y + cos * this.height/2;

        // Lights
        const targetX = x + sin * this.height/2 - sin * 20;
        this.lightsSprite.x = lerp(this.lightsSprite.x, targetX, 0.7);

        const targetY = y - cos * this.height/2  + cos * 20;
        this.lightsSprite.y = lerp(this.lightsSprite.y, targetY, 0.7);


        // Text holder
        this.nameText.x = x;
        this.nameText.y = y + this.height*0.75;

        // Score
        this.scoreText.x = x;
        this.scoreText.y = y + this.height*0.75 + Car.SCORE_TEXT_Y_OFFSET;

        this.dead = false;
    }
    get rotation(){
        return this.carSprite.rotation;
    }
    set rotation(val){
        this.carSprite.rotation = val;
        this.bumperSprite.rotation = val;
        this.lightsSprite.rotation = lerp(this.lightsSprite.rotation, val, 0.2);
    }
    move(delta)
    {
        // Force movement forwards when boosting
        if (this.boostIsOn){
            this.acc = 1;
        }


        this.rotateBy(this.turn * Car.TURN_SPEED * delta)
        
        this.xVel += Math.cos(this.rotation + radians(90)) * this.accSpeed * -this.acc;
        this.yVel += Math.sin(this.rotation + radians(90)) * this.accSpeed * -this.acc; //acc => dopredu|dozadu
        this.rotation += this.driftAngle * this.acc * 1;

        this.setPos(
            constrain(this.x + this.xVel, -Car.MAP_SIDE, Car.MAP_SIDE),
            constrain(this.y + this.yVel, -Car.MAP_SIDE, Car.MAP_SIDE)
        )

        
        this.driftAngle *= 0.85;
        this.xVel *= 0.93;
        this.yVel *= 0.93;
        this.speed *= 0.93;
    }
    updateTurboEmit(delta){
        // Turbo
        if(this.boostIsOn){
            const newParticles = this.turbo.emit(delta, this.x, this.y, this.rotation, this.carSprite.width, this.carSprite.height);
            for (let i in newParticles) {
                this.particles.push(newParticles[i]);
            }
        }
    }
    rotateBy(angl){
        if (angl == 0) return;
        if (Math.abs(this.driftAngle) < 5 - angl/5){
            this.driftAngle += angl/5
        }
        else if (angl > 0){
            this.driftAngle = 5
        }
        else{
            this.driftAngle = -5
        }
    }
    updateScore(score){
        this.scaleBumper(score - this.score);
        this.score = score;
        this.scoreText.text = score;
        
    }
    scaleBumper(val){
        // Math.Floor(x/y) same as x//y 
        for(let i = 0; i < Math.floor(val/5); i++)
        {
            // lerp isnt for animation purposes
            // It's for fast growth on start and slowly growing when score is big -- later comment: the comment is actually so usefull
            this.bumperSprite.scale.set(
                lerp(this.bumperSprite.scale.x, Car.MAX_BUMPER_SCALE * 1.5, 0.001),
                1
            );
            this.carSprite.scale.set(
                1,
                lerp(this.carSprite.scale.y, Car.MAX_BODY_SCALE, 0.001)
            );
            /* 
            this.lightsSprite.scale.set(
                lerp(this.lightsSprite.scale.x, Car.MAX_BUMPER_SCALE, 0.01),
                0.5
            ); */
        }
    }
    boostOn(){
        this.boostIsOn = true;
        this.accSpeed = Car.BOOST_SPEED;

        if (this.turboSound != null && this.turboSound.volume == 0){
            this.turboSound.stop();
            this.turboSound = null;
        }
        if (this.turboSound == null){
            this.turboSound = PIXI.sound.Sound.from(sounds.boost);
            this.turboSound.play();
        }

    }
    boostOff(){
        this.boostIsOn = false;
        this.accSpeed = Car.NORMAL_SPEED;

        if (this.turboSound != null)
        {
            this.turboSound.volume = 0.0;
        }
    }
    doesKill(otherCar){
        const myVertices = Car.getVertices(this.bumperSprite);
        myVertices[myVertices.length] = myVertices[0];//making points to be all around 

        const otherVertices = Car.getVertices(otherCar);
        otherVertices[otherVertices.length] = otherVertices[0];//making points to be all around 

        for (let i=0; i < myVertices.length -1; i++){
                for (let ii=0; ii < otherVertices.length - 1; ii++){
                if (Car.cross(
                    myVertices[i],
                    myVertices[i + 1],
                    otherVertices[ii],
                    otherVertices[ii + 1]
                )){
                    return true;
                }
            }
        }
        return false;
    }

    doesEat(food){
        // Point inside of Rectangle
        const M = [food.x, food.y];

        const eaters = [this.carSprite, this.bumperSprite];

        for (let i = 0; i < eaters.length; i++)
        {
            const myVertices = Car.getVertices(eaters[i]);
            const A = myVertices[0];
            const B = myVertices[1];
            const C = myVertices[2];
            //const d = myVertices[3];// Dont need 'D'
            const scalABAM = scalarProduct(sub(A, B), sub(A, M))
            const scalABAB = scalarProduct(sub(A, B), sub(A, B))
            const scalBCBM = scalarProduct(sub(B, C), sub(B, M))
            const scalBCBC = scalarProduct(sub(B, C), sub(B, C))
            if (0 <= scalABAM && scalABAM <= scalABAB &&
                0 <= scalBCBM && scalBCBM <= scalBCBC)
            {
                return true;
            }
        }

        return false
    }

    wipe()
    {
        this.container.removeChild(this.carSprite);
        this.container.removeChild(this.bumperSprite);
        this.container.removeChild(this.lightsSprite);
        this.container.removeChild(this.nameText);
        this.container.removeChild(this.scoreText);
    }
}

//
///
//////
///////// START TURBO
//////
///
//

class Turbo{
    static PARTICLES_PER_TICK = 15;
    static SPEED = 0.2;
    static RAND_SIDE = 10;
    static RAND_FRONT = 20;
    constructor(container, color)
    {
        this.color = color;
        this.container = container;
    }
    emit(delta, x,y, rotation, width, height)
    {
        let _particles = [];
        let nOfParticles = parseInt(Turbo.PARTICLES_PER_TICK * delta);
        for (let i = 0; i < nOfParticles; i++) 
        {
            const element = 5          
            const x1 = x + Math.cos(rotation) * ( width/2 - 10 ) + Math.cos(rotation + radians(90)) * height/2;
            const y1 = y + Math.sin(rotation) * ( width/2 - 10 ) + Math.sin(rotation + radians(90)) * height/2;
            _particles.push(new Particle(this.container, x1, y1, rotation, this.color));

            const x2 = x - Math.cos(rotation) * ( width/2 - 10 ) + Math.cos(rotation + radians(90)) * height/2;
            const y2 = y - Math.sin(rotation) * ( width/2 - 10 ) + Math.sin(rotation + radians(90)) * height/2;
            _particles.push(new Particle(this.container, x2, y2, rotation, this.color));
        }
        return _particles;

    }
}
class Particle{
    constructor(container, x, y, rotation, color)
    {
        this.sprite = new PIXI.Sprite(textures.turboParticle);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(0.5);

        const cosRotated = Math.cos(rotation + radians(90));
        const sinRotated = Math.sin(rotation + radians(90));

        let rSideVelX = (Math.random() * Turbo.RAND_SIDE * 2) - Turbo.RAND_SIDE;
        let rSideVelY = rSideVelX;
        rSideVelX *= Math.cos(rotation);
        rSideVelY *= Math.sin(rotation);

        let rFrontVelX = (Math.random() * Turbo.RAND_FRONT * 2) - Turbo.RAND_FRONT/2;// division cause i want it to go back
        let rFrontVelY = rFrontVelX;
        rFrontVelX *= cosRotated;
        rFrontVelY *= sinRotated;

        let rVelX = rSideVelX + rFrontVelX;
        let rVelY = rSideVelY + rFrontVelY;
        

        this.velX = (Turbo.SPEED) * cosRotated  + rVelX;
        this.velY = (Turbo.SPEED) * sinRotated  + rVelY;

        this.sprite.x = x + rVelX;
        this.sprite.y = y + rVelY;

        this.startColor = [1, 1, 1];
        this.endColor = PIXI.utils.hex2rgb(color);
        this.blendVal = 0;

        this.sprite.tint = PIXI.utils.rgb2hex(this.startColor);
        container.addChild(this.sprite);

            // DELETE ME INEFFICIENT!!
            this.sprite.zIndex = -1;
    }   
    update(){
        this.sprite.x += this.velX;
        this.sprite.y += this.velY;
        this.sprite.alpha -= 0.05;
        const newScale = this.sprite.scale.x + 0.1;
        this.sprite.scale.set(newScale);

        this.sprite.tint = blendColors(this.startColor, this.endColor, this.blendVal);
        this.blendVal = lerp(this.blendVal, 1, 0.2);
    }
    finished(){
        return this.sprite.alpha < 0;
    }
    wipe(container)
    {
        container.removeChild(this.sprite);
    }
} 
function blendColors(c1, c2, val)
{
    let color =  [0, 0, 0] 
    color[0] = c1[0] + (c2[0] - c1[0]) * val;
    color[1] = c1[1] + (c2[1] - c1[1]) * val;
    color[2] = c1[2] + (c2[2] - c1[2]) * val;
    return PIXI.utils.rgb2hex(color);
}

//
///
//////
///////// START SCOREBOARD
//////
///
//

class Scoreboard
{
    static TEXT_SPACING = 35;
    static SCORE_END_X = 237;
    static NAME_START_X = 15;
    static SCORE_TOP_PADDING = 10;
    static textStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 25,
        fill: ['#000000']
    });
    static myTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 25,
        fill: ['#0000FF']
    });

    constructor(container, texture)
    {
        this.container = container;
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.x = 0
        this.sprite.y = 0;
        this.sprite.alpha = 0.7;
        container.addChild(this.sprite);

        this.names = {};
        this.scores = {};
        this.nameFields = {}
        this.scoreFields = {}
    }
    updateBoard(id_nameAndScore, myCar, myId)
    {
        // Add my car
        this.names[myId] = myCar.name;
        this.scores[myId] = myCar.score;

        //Add missingzs players
        for(const id in id_nameAndScore)
        {
            this.names[id] = id_nameAndScore[id][0];
            this.scores[id] = id_nameAndScore[id][1];
        }
        // Remove redundant players
        for (const id in this.names)
        {
            if ( !id_nameAndScore.hasOwnProperty(id) )
            {
                delete this.scores[id];
                delete this.names[id];
                this.container.removeChild(this.nameFields[id]);
                delete this.nameFields[id];
                this.container.removeChild(this.scoreFields[id]);
                delete this.scoreFields[id];
            }
        }
        
        // Sorting scores
        var sortedScore = [];
        for (const id in this.scores) {
            sortedScore.push([id, this.scores[id]]);
        }
        sortedScore.sort(function(a, b) {
            return b[1] - a[1];
        });

        // Limit to 5
        sortedScore = sortedScore.splice(0, 5);

        for (const placement in sortedScore)
        {
            const id = sortedScore[placement][0];
            if ( !this.nameFields.hasOwnProperty(id) )
            {// Instantiate PIXI.Text objects

                const nameField = new PIXI.Text(this.names[id], Scoreboard.textStyle);
                nameField.x = Scoreboard.NAME_START_X;
                this.container.addChild(nameField);
                this.nameFields[id] = nameField;

                const scoreField = new PIXI.Text(this.scores[id], Scoreboard.textStyle);
                // Set anchor from left instead of right ( '0, 0'  )
                scoreField.anchor.set(1, 0)
                scoreField.x = Scoreboard.SCORE_END_X;
                this.container.addChild(scoreField);
                this.scoreFields[id] = scoreField;

                // Custom font-style
                if (id == myId)
                {
                    nameField.style = Scoreboard.myTextStyle;
                    scoreField.style = Scoreboard.myTextStyle;
                }
            }
            else{
                this.nameFields[id].text =   (1 + parseInt(placement)) + ". " + this.names[id];
                this.scoreFields[id].text =  this.scores[id];
            }
            const destPos = Scoreboard.SCORE_TOP_PADDING + placement * Scoreboard.TEXT_SPACING;
            const oldPos = this.nameFields[id].y;
            const newPos = lerp(oldPos, destPos, 0.2);
            this.nameFields[id].y = newPos
            this.scoreFields[id].y = newPos;
            //console.log("Name: " + this.names[id], "Score: " + this.scores[id]);
        }

    }
}

//
///
//////
///////// START FOOD
//////
///
//
class Food{
    constructor(container, x, y, color){
        this.container = container;
        //Create a car
        this.sprite = new PIXI.Sprite(textures.food);
        this.sprite.x = x;
        this.sprite.y = y;
        this.sprite.scale.set(0.5, 0.5);
        this.container.addChild(this.sprite);
        this.sprite.anchor.set(0.5);
        this.sprite.tint = color//if color is null, we assign rnd value
        //this.sprite.width = 100;
        //this.sprite.height = 200;
        
        this.isBeingDigested = false;
    }
    get x(){
        return this.sprite.x;
    }
    get y(){
        return this.sprite.y;
    }
    wipe(){
        this.container.removeChild(this.sprite);
    }
}


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
function shakeCam(intensity, force = false){
    // If cam is already shaking, and we dont need to force, then cancel shake
    if (isCameraShaking && force == false){
        return;
    }
    shakeCamIntensity = intensity;
    isCameraShaking = true;
}
function stopCameraShake(){
    isCameraShaking = false;
    shakeCamTime = 0 ;
}



socket.on("join", initData =>{
    startRot = (mouseControls) ? mouseAngle : Math.random() * (Math.PI * 2) ; // () ? Mouse angle : or random angle
    car = new Car(container,
        particles,
        initData.x,
        initData.y,
        startRot,
        initData.color,
        initData.name,
        initData.score
    )



    mouseControls = mouseCheckbox.checked;  

    mouseAngle = startRot;
    playerPoint.tint = initData.color;

    guiContainer.alpha = 1;
    killCountText.text = "0";
    killCount = 0;

    isTurningRight = false;
    isTurningLeft = false;
    isGoingForward = false;
    isGoingBackward = false;

    console.log("joining...");
    overlay.style.display = "none";
    inGame = true;
});


// Kill response from server
socket.on("u killed", iKilled);
function iKilled(data)
{
    killCountText.text = ++killCount;

    PIXI.sound.play("crash");

    shakeCam(killShakeIntensity, true);
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
            stopCameraShake();
            clearInterval(t);
        }

    }, 30)
}


socket.on("dead", (data)=>{

    inGame = false;
    console.log("you died");
    shakeCam(killShakeIntensity, true);

    PIXI.sound.play("crash");

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
            guiContainer.alpha = 0;

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

app.stage.on("pointermove", (e)=>
{

    if (mouseControls)
    {
        const pos = e.data.global;
        // [a, b] is vector = center-pos
        const a = pos.x - app.screen.width/2;
        const b = pos.y - app.screen.height/2;


        mouseAngle = Math.atan2(b, a);
        mouseAngle =  (mouseAngle + Math.PI * 2.5) % (Math.PI * 2) // Offset

        if(inGame){
            // cis the distance from mouse to center  of my car
            const c = Math.sqrt(a * a + b * b);
            if (c < 40){
                car.acc = 0;    
            }
            else{
                car.acc = 1;
            }
        }
            
    }
});
app.stage.interactive = true;
app.view.addEventListener("pointerdown", ()=>
{
    if (mouseControls)
    {
        isPressingEnter = true;
        if (inGame){
            shakeCam(boostShakeIntensity);
        }
    }

});
app.view.addEventListener("pointerup", ()=>
{
    if (mouseControls)
    {
        isPressingEnter = false;
        if (inGame)
        {
            isBoostEnabled = true;
            car.boostOff();
            stopCameraShake();
        }
    }
});
app.view.addEventListener("mouseout", ()=>
{
    mouseInGame = false;
});  
app.view.addEventListener("mouseover", ()=>
{
    mouseInGame = true;
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
            if (inGame)
            {
                isBoostEnabled = true;
                car.boostOff();
            }
            break;

    }
}



// Resize function window
window.addEventListener('resize', resize);
function resize() 
{
    const myScreenRatio = window.innerWidth / window.innerHeight;

    if (myScreenRatio > RATIO_NORM) // WIDE SCREEN
    {
        appWidth = Math.min(WIDTH_NORM, window.innerWidth);;
        appHeight = appWidth / myScreenRatio;
    }
    else if(myScreenRatio < RATIO_NORM) // TALL SCREEN
    {
        appHeight = Math.min(HEIGHT_NORM, window.innerHeight);
        appWidth = appHeight * myScreenRatio;
    }
    else{
        appWidth = WIDTH_NORM;
        appHeight = HEIGHT_NORM;
    }

    // Move container to the center
    container.x = appWidth / 2;
    container.y = appHeight / 2;

    // GUI Resizing    
    scoreboardContainer.position.x = appWidth - 270;

    minimapContainer.position.x =appWidth - 80;
    minimapContainer.position.y = appHeight - 80;
    
    boostContainer.position.x = appWidth / 2;
    boostContainer.position.y = appHeight - 40;

    fpsText.y = appHeight - 20;
    
    victimText.x = appWidth / 2;
    victimText.y = appHeight / 2 - 200;

    deathText.x = appWidth / 2;
    deathText.y = appHeight / 2 + 150;


    //console.log(`appWidth: ${appWidth}`);
    app.renderer.resize(appWidth, appHeight);

}

resize();


$(document).ready(()=>{
    $("#nameButton").click(()=>{
        if (loaded)
        {
            $name = $("#name-input").val();
            socket.emit("join", {name: $name});
        }
    });
    $('#name-input').keypress( (e) => {
        if (e.which == 13) {
            $("#nameButton").click();
        }
      });

});