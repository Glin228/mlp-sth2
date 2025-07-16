const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
let marines = [];
let rockets = [];
let explosions = [];
let corpses = [];
let drones = [];
let grenades = [];
const ENEMY_SPAWN_MIN = 750;
const ENEMY_SPAWN_DELTA = 1100;
const SOUND_VOL = 0.1;
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
const DEATH_RANGE = 70;
for (let i = 1; i<17; i++){
    explosion_srcs.push(`explosion/${i}.png`);
}
let stand = new Image();
stand.src = "stand.png";
let walk1 = new Image();
walk1.src = "walk1.png";
let walk2 = new Image();
walk2.src = "walk2.png";
let launched = 0;
let popal = 0;

const WIN_TIMEOUT = 180_000;

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

class Drone extends Sprite{
    constructor(parentmarine){
        super(["drone.png"], 1, 0.05);
        this.x = parentmarine.x;
        this.y = parentmarine.y;
        this.state = "take_off";
        this.p_marine_y = parentmarine.y;
    }
    update(){
        if (this.state === "take_off"){
            this.y -= 2;
            if (Math.max(this.y - player.y, this.y - this.p_marine_y) < -70){
                this.state = "flight";
            }
        } else if (this.state === "flight"){
            this.x -= 1;
            if (Math.floor(this.x) == Math.floor(player.x)){
                this.state = "wait";
                setTimeout(()=>this.state="flyaway", 1000);
                grenades.push(new Grenade(this));
            }
        } else if (this.state === "flyaway"){
            this.x += 3;
        }
        this.draw();
    }
}

class Grenade extends Sprite{
    constructor(parentdrone){
        super(["grenade.png"], 1, 0.02);
        this.x = parentdrone.x;
        this.y = parentdrone.y;
        this.target_y = parentdrone.y + 80;
        this.yv = 0;
        this.delete_me = false;
    }
    update(){
        if(this.y < this.target_y){
            this.yv+=0.3;
            this.y+=this.yv;
        } else {
            if (Math.hypot(player.x-this.x, player.y-this.y)<DEATH_RANGE){
                umer();
            }
            this.delete_me = true;
        }
        this.draw()
    }
}

class GrenadeExplosion extends Explosion{
    //TODO: change this explosion to another explosion
    constructor(x, y){
        super(x, y);
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

function umer(){
    clearInterval(update_interval);
    game.pause();
    clearTimeout(govno);
    spawnenemies = false;
    ctx.drawImage(document.getElementById("actualdeathscreen"), 0, 0);
    document.addEventListener("keypress", (kp)=>{
        if (kp.key === "Enter"){
            //console.log("how");
            window.location.reload();
        }
    })
    //document.body.requestFullscreen("hide"); every browser is proprietary garbage that wont let me :(((((
    document.body.style.animationName = "umer";
    document.body.style.animationDuration = "0.1s";
    document.body.style.animationIterationCount = "infinite";
    new Audio("Screamer.mp3").play();
    new Audio("FemurBreaker.ogg").play();
}

function Spawn(){
    if(!spawnenemies) return;
    marines.push(new Marine());
    setTimeout(Spawn, Math.random()*ENEMY_SPAWN_DELTA+ENEMY_SPAWN_MIN);
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
    drones.forEach((v)=>{if(v){v.update()}else{console.log(drones)}});
    grenades.forEach((v)=>{v.update()});
    RPG.draw();
    for (let r in rockets){
        for (let m in marines){
            if (rockets[r] === undefined || marines[m] === undefined) return;
            if (doCollide(rockets[r].getRect(), marines[m].getRect())){
                popal++;
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
    let ratio;
    if (launched==0){
        ratio = "N/A";
    } else {
        ratio = Math.round(popal*100/launched)+"%";
    }
    ctx.fillText(`${Math.round(dt/1000)}/${Math.round(WIN_TIMEOUT/1000)} | ${popal}/${launched} (${ratio})`, 10, 40);
    for (m of marines){
        if (m.x < 150){
            game.pause();
            clearTimeout(govno);
            proigral();
        }
    }
    for (g in grenades){
        if (grenades[g] === undefined){
            break;
        }
        if (grenades[g].delete_me){
            explosions.push(new GrenadeExplosion(grenades[g].x, grenades[g].y));
            [grenades[g], grenades[0]] = [grenades[0], grenades[g]];
            grenades.shift();
            
        }
    }
    for (d in drones){
        if (drones[d] === undefined){
            break;
        }
        if (drones[d].x > 610){
            [drones[d], drones[0]] = [drones[0], drones[d]];
            drones.shift();
            break
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
let showintro = true;
let govno;
let dt;
let running = false;
let g_launcher;
async function main(){
    if (running) return;
    running = true;
    console.log("Entered main()");
    document.querySelector("div#main p:nth-child(1)").remove();

    ctx.drawImage(document.getElementById("menuscreen"), 0, 0);
    let menusong = new Audio("menu.mp3");
    //I hate myself.
    [
        launchSnd,
        flySnd,
        game_over,
        win,
        story,
        explosionSnd,
        menusong,
        game
    ].forEach(v=>v.volume = SOUND_VOL);
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
        slide.src = "story/1.png";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 1000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story/2.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 16000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story/3.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 31000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story/4.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 46000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story/5.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 61000);
    setTimeout(()=>{
        let slide = new Image();
        slide.src = "story/6.jpg";
        slide.onload = ()=>ctx.drawImage(slide, 0, 0);
    }, 76000);

    await new Promise((res, rej)=>{
        setTimeout(res, 76000);
    });
    } else {
        let slide = new Image();
        slide.src = "story/6.jpg";
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
    }, 300_000);
    startT = Date.now();
    update_interval = setInterval(()=>{update()}, 20);
    player.x = 50;
    player.y = 300;
    RPG = new Sprite(["ready.png"], 1, 0.1);
    g_launcher = setInterval(()=>drones.push(new Drone(marines.at(Math.min(marines.length-1, 5)))), 10_000);
    Spawn();
    document.addEventListener("keydown", (kp)=>{pressedKeys[kp.key] = true});
    document.addEventListener("keyup", (kp)=>{pressedKeys[kp.key] = false});
    document.addEventListener("keypress", (kp)=>{
        console.log(dt);
        if (kp.key === " " && canLaunch && dt<=WIN_TIMEOUT){
            launched++;
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
            }, 1000);
            launchSnd.play();
            flySnd.play();
        }
    });
    document.getElementById("upbtn")
    .addEventListener("touchstart", ()=>pressedKeys.w=true);
    document.getElementById("upbtn")
    .addEventListener("touchend", ()=>pressedKeys.w=false);
    document.getElementById("downbtn")
    .addEventListener("touchstart", ()=>pressedKeys.s=true);
    document.getElementById("downbtn")
    .addEventListener("touchend", ()=>pressedKeys.s=false);
    document.getElementById("firebtn")
    .addEventListener("click", ()=>{
        console.log(dt);
        if (canLaunch && dt<=WIN_TIMEOUT){
            launched++;
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
            }, 1000);
            launchSnd.play();
            flySnd.play();
        }});
}

canvas.addEventListener("click", ()=>setTimeout(main, 200));
document.addEventListener("keypress", ()=>{setTimeout(main, 200)});
