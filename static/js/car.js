const MAX_SPEED = 0.8;
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
const MAX_BUMPER_SCALE = 6
class Car{
    constructor(container, x, y, angle, color, name, score){
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



        // Sets pos. of all components
        this.setPos(x, y)

        this.xVel = 0;
        this.yVel = 0;
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
        if (this.acc == -1)
        {
            this.acc = -0.7
        }
        this.rotateBy(this.turn * TURN_SPEED * delta)
        
        this.xVel += Math.cos(this.rotation + radians(90)) * MAX_SPEED * -this.acc;
        this.yVel += Math.sin(this.rotation + radians(90)) * MAX_SPEED * -this.acc; //acc => dopredu|dozadu
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
                lerp(this.carSprite.scale.y, MAX_BODY_SCALE, 0.0005)
            );
            /* 
            this.lightsSprite.scale.set(
                lerp(this.lightsSprite.scale.x, MAX_BUMPER_SCALE, 0.01),
                0.5
            ); */
        }
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
        const myVertices = this.getVertices(this);
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