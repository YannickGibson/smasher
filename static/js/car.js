const NORMAL_SPEED = 0.8;
const BOOST_SPEED = 1.8;
const TURN_SPEED = 0.1;
const SCORE_TEXT_Y_OFFSET = 30;
const MAX_BODY_SCALE = 4;

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
const playerNameStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 20,
    fill: ['#ffffff']
});
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
const MAP_SIDE = 512*5//image-size*(scale/2) ##idk why divided by 2 
const MAX_BUMPER_SCALE = 6;

class Car{
    constructor(container, particles, x, y, angle, color, name, score){
        this.name = name;
        this.container = container;
        this.speed = 0;
        this.acc = 0;
        this.turn = 0
        this.driftAngle = 0;

        //Create a car
        this.carSprite = new PIXI.Sprite.from('static/images/vehicles/basic.png');
        this.carSprite.rotation = angle;
        this.carSprite.width = 100;
        this.carSprite.height = 200;
        this.container.addChild(this.carSprite);
        this.carSprite.anchor.set(0.5);
        this.carSprite.tint = color//if color is null, we assign rnd value

        // Create a bumper
        this.bumperSprite = new PIXI.Sprite.from('static/images/bumpers/basic.png');
        this.container.addChild(this.bumperSprite);
        this.bumperSprite.rotation = angle;
        this.bumperSprite.anchor.set(0.5);

        // Create lights
        this.lightsSprite = new PIXI.Sprite.from('static/images/lights/basic.png');
        this.container.addChild(this.lightsSprite);
        this.lightsSprite.anchor.set(0.5);
        this.lightsSprite.rotation = angle;
        this.lightsSprite.scale.set(0.5, 0.5);
        const sin = Math.sin(this.carSprite.rotation);
        this.lightsSprite.x = x + sin * this.height/2 - sin *20;//offset
        const cos = Math.cos(this.carSprite.rotation);
        this.lightsSprite.y = y - cos * this.height/2 + cos*20;
        
        this.scaleBumper(score);


        
        this.nameText = new PIXI.Text(name, playerNameStyle);
        this.nameText.x = x;
        this.nameText.y = y + this.height*0.75;
        this.nameText.anchor.set(0.5);
        container.addChild(this.nameText);

        this.scoreText = new PIXI.Text(score, playerNameStyle);
        this.scoreText.x = x;
        this.scoreText.y = y + this.height*0.75 + SCORE_TEXT_Y_OFFSET;
        this.scoreText.anchor.set(0.5);
        container.addChild(this.scoreText);

        this.accSpeed = NORMAL_SPEED;

        // Sets pos. of all components
        this.setPos(x, y)

        this.xVel = 0;
        this.yVel = 0;

        

        this.turbo = new Turbo(container, color);
        this.boostIsOn = false;
        this.particles = particles;
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
        this.scoreText.y = y + this.height*0.75 + SCORE_TEXT_Y_OFFSET;

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
        if (this.boostIsOn){
            this.acc = 1;
        }


        this.rotateBy(this.turn * TURN_SPEED * delta)
        
        this.xVel += Math.cos(this.rotation + radians(90)) * this.accSpeed * -this.acc;
        this.yVel += Math.sin(this.rotation + radians(90)) * this.accSpeed * -this.acc; //acc => dopredu|dozadu
        this.rotation += this.driftAngle * this.acc * 1;

        this.setPos(
            constrain(this.x + this.xVel, -MAP_SIDE, MAP_SIDE),
            constrain(this.y + this.yVel, -MAP_SIDE, MAP_SIDE)
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
                lerp(this.bumperSprite.scale.x, MAX_BUMPER_SCALE * 1.5, 0.001),
                1
            );
            this.carSprite.scale.set(
                1,
                lerp(this.carSprite.scale.y, MAX_BODY_SCALE, 0.001)
            );
            /* 
            this.lightsSprite.scale.set(
                lerp(this.lightsSprite.scale.x, MAX_BUMPER_SCALE, 0.01),
                0.5
            ); */
        }
    }
    boostOn(){
        this.boostIsOn = true;
        this.accSpeed = BOOST_SPEED;
    }
    boostOff(){
        this.boostIsOn = false;
        this.accSpeed = NORMAL_SPEED;
    }
    getVertices(spriteObject){
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
    cross(a1, a2, b1, b2){
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

    doesKill(otherCar){
        const myVertices = this.getVertices(this.bumperSprite);
        myVertices[myVertices.length] = myVertices[0];//making points to be all around 

        const otherVertices = this.getVertices(otherCar);
        otherVertices[otherVertices.length] = otherVertices[0];//making points to be all around 

        for (let i=0; i < myVertices.length -1; i++){
                for (let ii=0; ii < otherVertices.length - 1; ii++){
                if (this.cross(
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
            const myVertices = this.getVertices(eaters[i]);
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
        this.sprite = new PIXI.Sprite.from('static/images/turbos/basic.png');
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