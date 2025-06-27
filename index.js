const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
let marines = [];
let rockets = [];
let explosions = [];
let corpses = [];
const ENEMY_SPAWN_MIN = 750;
const ENEMY_SPAWN_DELTA = 1100;
const launchSnd = new Audio("launch.wav");
const flySnd = new Audio("rocketfly.wav");
const game_over = new Audio("game_over.mp3");
const win = new Audio("win.mp3");
const story = new Audio("story.mp3");
let game = new Audio("game.mp3");
let canLaunch = true;
let pressedKeys = {};
const explosionSnd = new Audio("explosion.mp3");
let explosion_srcs = [];
let spawnenemies = true;
for (let i = 1; i<17; i++){
    explosion_srcs.push(`explosion/${i}.png`);
}
let stand = new Image();
stand.src = "stand.png";
let walk1 = new Image();
walk1.src = "walk1.png";
let walk2 = new Image();
walk2.src = "walk2.png";

const WIN_TIMEOUT = 120_000;

class Sprite{
    constructor(imagesrcs, animdelay, scale = 1){
        this.x = null;
        this.y = null;
        this.images = [];
        this.deltaT = animdelay;
        for (let i of imagesrcs){
            this.images.push(new Image());
            this.images.at(-1).src = i;
        }
        this.scale = scale;
        this.t0 = Date.now();
    }
    _getImage(){
        let dt = Date.now() - this.t0;
        //console.log(this.images[Math.floor(dt/this.deltaT)%this.images.length]);
        return this.images[Math.floor(dt/this.deltaT)%this.images.length];
    }
    draw(){
        if (this.x === null || this.y === null){
            throw new Error(`Sprite coords not set!`);
        }
        let img = this._getImage();
        try{
            ctx.drawImage(img, this.x-img.width*this.scale/2, this.y-img.height*this.scale/2, img.width*this.scale, img.height*this.scale);
        } catch (e){
            console.log(`Can't render ${this}. Cause: ${e}`);
        }
    }
    getRect(){
        let img = this._getImage();
        return [
            {x: this.x-img.width*this.scale/2, y: this.y-img.height*this.scale/2},
            {x: this.x+img.width*this.scale/2, y: this.y-img.height*this.scale/2},
            {x: this.x-img.width*this.scale/2, y: this.y+img.height*this.scale/2},
            {x: this.x+img.width*this.scale/2, y: this.y+img.height*this.scale/2},
        ];
    }
    toString(){
        return JSON.stringify(this);
    }
}

class Marine extends Sprite{
    constructor(){
        super(
            ["enemy1.png", "enemy2.png", "enemy3.png", "enemy4.png", "enemy5.png", "enemy6.png"],
            400,
            2
        );
        this.x = 620;
        this.y = Math.random()*500+50;
    }
    update(){
        this.x-=0.25;
        this.draw()
    }
}

class Rocket extends Sprite{
    constructor(){
        super(["rocket.png"], 1, 0.1);
        this.x = player.x;
        this.y = player.y-10;
    }
    update(){
        this.x+=10;
        this.draw();
    }
}

class Explosion extends Sprite{
    constructor(x, y){
        super(explosion_srcs, 50);
        this.x = x;
        this.y = y;
        this.frame = 0;
    }
    update(){
        this.draw();
        this.frame+=0.25;
    }
    draw(){
        if (this.frame>15) return;
        ctx.drawImage(this.images[Math.floor(this.frame)], this.x-50, this.y-50);
    }
}

function doCollide(r1, r2) {
    if (r1 === undefined || r2 === undefined) return false;
    const getBounds = (rect) => {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        rect.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });
        return { minX, maxX, minY, maxY };
    };
    const bounds1 = getBounds(r1);
    const bounds2 = getBounds(r2);
    return !(bounds1.maxX < bounds2.minX ||
             bounds1.minX > bounds2.maxX ||
             bounds1.maxY < bounds2.minY ||
             bounds1.minY > bounds2.maxY);
}

function proigral(){
    clearInterval(update_interval);
    spawnenemies = false;
    ctx.drawImage(document.getElementById("deathscreen"), 0, 0);
    game_over.play();
    document.addEventListener("keypress", (kp)=>{
        if (kp.key === "Enter"){
            //console.log("how");
            window.location.reload();
        }
    })
}

function vyigral(){
    clearInterval(update_interval);
    spawnenemies = false;
    ctx.drawImage(document.getElementById("victoryscreen"), 0, 0);
    win.play();
    document.addEventListener("keypress", (kp)=>{
        if (kp.key === "Enter"){
            //console.log("how");
            window.location.reload();
        }
    })
}

function Spawn(){
    if(!spawnenemies) return;
    marines.push(new Marine());
    setTimeout(Spawn, Math.random()*ENEMY_SPAWN_MIN+ENEMY_SPAWN_DELTA);
}

function update(){
    RPG.x = player.x;
    RPG.y = player.y-10;
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.moveTo(150, 0);
    ctx.fillStyle = "orange";
    ctx.lineTo(150, 600);
    ctx.stroke();
    corpses.forEach((v)=>{v.draw()});
    marines.forEach((v)=>{v.update()});
    player.draw();
    if (pressedKeys.s){
        player.y+=3;
        player.images = [walk1, walk2];
    } else if (pressedKeys.w){
        player.y-=3;
        player.images = [walk2, walk1];
    } else {
        player.images = [stand];
    }
    explosions.forEach((v)=>{v.update()});
    rockets.forEach((v)=>{v.update()});
    RPG.draw();
    for (let r in rockets){
        for (let m in marines){
            if (rockets[r] === undefined || marines[m] === undefined) return;
            if (doCollide(rockets[r].getRect(), marines[m].getRect())){
                flySnd.pause();
                flySnd.currentTime = 0;
                explosionSnd.currentTime = 0;
                explosionSnd.play();
                explosions.push(new Explosion(marines[m].x, marines[m].y));
                [marines[m], marines[marines.length-1]] = [marines[marines.length-1], marines[m]];
                corpses.push(new Sprite(["enemy_corpse.png"], 1, 0.7));
                corpses.at(-1).x = marines.at(-1).x;
                corpses.at(-1).y = marines.at(-1).y;
                marines.pop();
                [rockets[r],rockets[rockets.length-1]] = [rockets[rockets.length-1], rockets[r]];
                rockets.pop();
            }
        }
    }
    if (rockets.length>0 && rockets.at(-1).x > 600){
        rockets.pop();
    }
    dt = Date.now() - startT;
    ctx.font = "24px italic";
    ctx.fillStyle = "red";
    ctx.fillText(`${Math.round(dt/1000)}/${Math.round(WIN_TIMEOUT/1000)}`, 10, 40);
    for (m of marines){
        if (m.x < 150){
            game.pause();
            clearTimeout(govno);
            proigral();
        }
    }
    if (dt>WIN_TIMEOUT){
        game.pause();
        clearTimeout(govno);
        vyigral();
    }
}

const player = new Sprite(["stand.png"], 1, 0.04);
let update_interval;
let startT;
let RPG;
const showintro = true;
let govno;
let dt;
let running = false;
async function main(){
    if (running) return;
    running = true;
    console.log("Entered main()");
    document.querySelector("div#main p:nth-child(1)").remove();

    ctx.drawImage(document.getElementById("menuscreen"), 0, 0);
    let menusong = new Audio("menu.mp3");
    menusong.play()
    await new Promise((res, rej)=>{
        document.addEventListener("keypress", (kp)=>{
            if (kp.key === "Enter"){
                res();
            }
        });
        canvas.addEventListener("click", res);
    });

    menusong.pause();
    if (showintro){
    story.play();
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story1.png";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 1000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story2.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 11000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story3.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 21000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story4.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 31000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story5.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 41000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story6.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 51000);

    await new Promise((res, rej)=>{
        setTimeout(res, 51000);
    });
    } else {
        let slide = new Image();
        slide.src = "story6.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }
    await new Promise((res, rej)=>{
        document.addEventListener("keypress", (kp)=>{
            if (kp.key === "Enter"){
                res();
            }
        });
        canvas.addEventListener("click", res);
    });

    story.pause();
    game.play();
    govno = setTimeout(()=>{
        game.currentTime = 0;
        game.play();
    }, 112_000);
    startT = Date.now();
    update_interval = setInterval(()=>{update()}, 20);
    player.x = 50;
    player.y = 300;
    RPG = new Sprite(["ready.png"], 1, 0.1);
    Spawn();
    document.addEventListener("keydown", (kp)=>{pressedKeys[kp.key] = true});
    document.addEventListener("keyup", (kp)=>{pressedKeys[kp.key] = false});
    document.addEventListener("keypress", (kp)=>{
        console.log(dt);
        if (kp.key === " " && canLaunch && dt<=WIN_TIMEOUT){
            rockets.push(new Rocket());
            canLaunch = false;
            let unreadyrpg = new Image();
            unreadyrpg.src = "reloading.png";
            unreadyrpg.onload = () => RPG.images = [unreadyrpg];
            setTimeout(()=>{
                canLaunch=true;
                let readyrpg = new Image();
                readyrpg.src = "ready.png";
                readyrpg.onload = () => RPG.images = [readyrpg];
            }, 1500);
            launchSnd.play();
            flySnd.play();
        }
    });
    document.getElementById("upbtn")
    .addEventListener("mousedown", ()=>pressedKeys.w=true);
    document.getElementById("upbtn")
    .addEventListener("mouseup", ()=>pressedKeys.w=false);
    document.getElementById("downbtn")
    .addEventListener("mousedown", ()=>pressedKeys.s=true);
    document.getElementById("downbtn")
    .addEventListener("mouseup", ()=>pressedKeys.s=false);
    document.getElementById("firebtn")
    .addEventListener("click", ()=>{
        console.log(dt);
        if (canLaunch && dt<=WIN_TIMEOUT){
            rockets.push(new Rocket());
            canLaunch = false;
            let unreadyrpg = new Image();
            unreadyrpg.src = "reloading.png";
            unreadyrpg.onload = () => RPG.images = [unreadyrpg];
            setTimeout(()=>{
                canLaunch=true;
                let readyrpg = new Image();
                readyrpg.src = "ready.png";
                readyrpg.onload = () => RPG.images = [readyrpg];
            }, 1500);
            launchSnd.play();
            flySnd.play();
        }});
}

canvas.addEventListener("click", ()=>setTimeout(main, 200));
document.addEventListener("keypress", ()=>{setTimeout(main, 200)});