class Food{
    constructor(container, x, y, color){
        this.container = container;
        //Create a car
        this.sprite = new PIXI.Sprite.from('static/images/spawning/food.png');
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