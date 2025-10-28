// 超级玛丽游戏主逻辑
class SuperMarioGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, gameover, win
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.time = 300;
        this.world = '1-1';
        this.enemiesKilled = 0;
        
        // 重力和物理
        this.gravity = 0.6;
        this.friction = 0.8;
        
        // 摄像机
        this.camera = {
            x: 0,
            y: 0
        };
        
        // 玩家（马里奥）
        this.player = {
            x: 100,
            y: 0,
            width: 32,
            height: 32,
            velocityX: 0,
            velocityY: 0,
            speed: 5,
            jumpPower: 15,
            onGround: false,
            isBig: false,
            isInvincible: false,
            direction: 1, // 1: 右, -1: 左
            animationFrame: 0,
            animationCounter: 0,
            landingCount: 0 // 记录着陆次数
        };
        
        // 着陆消息
        this.landingMessage = {
            show: false,
            opacity: 0,
            duration: 0,
            text: ''
        };
        
        // 关卡数据
        this.platforms = [];
        this.bricks = [];
        this.questionBlocks = [];
        this.enemies = [];
        this.items = [];
        this.coinObjects = [];
        this.particles = [];
        this.flagPole = null;
        
        // 控制
        this.keys = {};
        
        // 初始化
        this.initEventListeners();
        this.buildLevel();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 计时器
        this.timeInterval = null;
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initEventListeners() {
        // 菜单按钮
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('instructionsBtn').addEventListener('click', () => {
            document.getElementById('instructions').classList.remove('hidden');
        });
        document.getElementById('closeInstructions').addEventListener('click', () => {
            document.getElementById('instructions').classList.add('hidden');
        });
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('menuBtn').addEventListener('click', () => this.returnToMenu());
        
        // 键盘控制
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'w' || e.key === 'arrowup') {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    buildLevel() {
        const blockSize = 40;
        
        // 地面
        for (let i = 0; i < 200; i++) {
            this.platforms.push({
                x: i * blockSize,
                y: this.canvas.height - blockSize * 2,
                width: blockSize,
                height: blockSize * 2,
                type: 'ground'
            });
        }
        
        // 漂浮平台
        for (let i = 0; i < 5; i++) {
            const startX = 300 + i * 400;
            for (let j = 0; j < 3; j++) {
                this.platforms.push({
                    x: startX + j * blockSize,
                    y: this.canvas.height - blockSize * 5 - i * 30,
                    width: blockSize,
                    height: blockSize,
                    type: 'platform'
                });
            }
        }
        
        // 砖块
        for (let i = 0; i < 10; i++) {
            this.bricks.push({
                x: 500 + i * blockSize * 1.5,
                y: this.canvas.height - blockSize * 8,
                width: blockSize,
                height: blockSize,
                active: true
            });
        }
        
        // 问号方块
        const questionPositions = [
            {x: 400, y: this.canvas.height - blockSize * 8},
            {x: 600, y: this.canvas.height - blockSize * 8},
            {x: 1000, y: this.canvas.height - blockSize * 6},
            {x: 1400, y: this.canvas.height - blockSize * 9},
            {x: 1800, y: this.canvas.height - blockSize * 7},
            {x: 2200, y: this.canvas.height - blockSize * 8},
            {x: 2600, y: this.canvas.height - blockSize * 10}
        ];
        
        questionPositions.forEach((pos, index) => {
            this.questionBlocks.push({
                x: pos.x,
                y: pos.y,
                width: blockSize,
                height: blockSize,
                active: true,
                content: index === 0 ? 'coin' : (Math.random() > 0.5 ? 'coin' : 'mushroom'), // 第一个必定是竹子
                bounce: 0
            });
        });
        
        // 敌人
        const enemyPositions = [700, 1200, 1600, 2000, 2400, 2800, 3200, 3600];
        enemyPositions.forEach(x => {
            this.enemies.push({
                x: x,
                y: this.canvas.height - blockSize * 2 - 32,
                width: 32,
                height: 32,
                velocityX: -1,
                alive: true,
                type: 'goomba'
            });
        });
        
        // 终点旗杆
        this.flagPole = {
            x: 7000,
            y: this.canvas.height - blockSize * 2 - 200,
            width: 10,
            height: 200,
            reached: false
        };
        
        // 深渊
        this.pits = [
            {x: 3400, width: 200},
            {x: 4800, width: 150},
            {x: 6000, width: 180}
        ];
    }
    
    startGame() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        this.gameState = 'playing';
        
        // 开始计时
        this.timeInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                this.time--;
                if (this.time <= 0) {
                    this.time = 0;
                    this.loseLife();
                }
            }
        }, 1000);
        
        this.gameLoop();
    }
    
    restartGame() {
        // 重置游戏状态
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.time = 300;
        this.enemiesKilled = 0;
        
        // 重置玩家
        this.player.x = 100;
        this.player.y = 0;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.player.isBig = false;
        this.player.isInvincible = false;
        this.player.landingCount = 0;
        
        // 重置着陆消息
        this.landingMessage.show = false;
        this.landingMessage.opacity = 0;
        this.landingMessage.duration = 0;
        this.landingMessage.text = '';
        
        // 重置摄像机
        this.camera.x = 0;
        this.camera.y = 0;
        
        // 重建关卡
        this.platforms = [];
        this.bricks = [];
        this.questionBlocks = [];
        this.enemies = [];
        this.items = [];
        this.coinObjects = [];
        this.particles = [];
        this.buildLevel();
        
        // 隐藏游戏结束界面
        document.getElementById('gameOver').classList.add('hidden');
        
        // 开始游戏
        this.gameState = 'playing';
        if (this.timeInterval) clearInterval(this.timeInterval);
        this.startGame();
    }
    
    returnToMenu() {
        if (this.timeInterval) clearInterval(this.timeInterval);
        document.getElementById('gameContainer').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('menu').classList.remove('hidden');
        this.gameState = 'menu';
    }
    
    loseLife() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver(false);
        } else {
            // 重置玩家位置
            this.player.x = 100;
            this.player.y = 0;
            this.player.velocityX = 0;
            this.player.velocityY = 0;
            this.camera.x = 0;
            this.time = 300;
        }
    }
    
    gameOver(won) {
        this.gameState = 'gameover';
        if (this.timeInterval) clearInterval(this.timeInterval);
        
        const gameOverEl = document.getElementById('gameOver');
        const titleEl = document.getElementById('gameOverTitle');
        
        if (won) {
            titleEl.textContent = '🏆 Level Complete!';
            this.score += this.time * 50; // Time bonus
        } else {
            titleEl.textContent = '💀 Game Over';
        }
        
        gameOverEl.classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('totalCoins').textContent = this.coins;
        document.getElementById('enemiesKilled').textContent = this.enemiesKilled;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // 更新玩家
        this.updatePlayer();
        
        // 更新敌人
        this.updateEnemies();
        
        // 更新道具
        this.updateItems();
        
        // 更新金币对象
        this.updateCoinObjects();
        
        // 更新粒子效果
        this.updateParticles();
        
        // 更新问号方块动画
        this.questionBlocks.forEach(block => {
            if (block.bounce > 0) {
                block.bounce -= 2;
            }
        });
        
        // 更新着陆消息
        if (this.landingMessage.show) {
            this.landingMessage.duration--;
            if (this.landingMessage.duration <= 30) {
                // 最后30帧淡出
                this.landingMessage.opacity = this.landingMessage.duration / 30;
            }
            if (this.landingMessage.duration <= 0) {
                this.landingMessage.show = false;
            }
        }
        
        // 更新摄像机
        this.updateCamera();
        
        // 检查终点
        this.checkFlagPole();
    }
    
    updatePlayer() {
        const player = this.player;
        
        // 动画
        player.animationCounter++;
        if (player.animationCounter > 8) {
            player.animationCounter = 0;
            player.animationFrame = (player.animationFrame + 1) % 3;
        }
        
        // 左右移动
        if (this.keys['arrowleft'] || this.keys['a']) {
            player.velocityX = -player.speed;
            player.direction = -1;
        } else if (this.keys['arrowright'] || this.keys['d']) {
            player.velocityX = player.speed;
            player.direction = 1;
        } else {
            player.velocityX *= this.friction;
        }
        
        // 跳跃
        if ((this.keys[' '] || this.keys['w'] || this.keys['arrowup']) && player.onGround) {
            player.velocityY = -player.jumpPower;
            player.onGround = false;
        }
        
        // 应用重力
        player.velocityY += this.gravity;
        
        // 应用速度
        player.x += player.velocityX;
        player.y += player.velocityY;
        
        // 碰撞检测 - 平台
        const wasOnGround = player.onGround;
        player.onGround = false;
        this.platforms.forEach(platform => {
            if (this.checkCollision(player, platform)) {
                // 从上方落下
                if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                    player.y = platform.y - player.height;
                    player.velocityY = 0;
                    player.onGround = true;
                    
                    // 检测从空中落地（之前不在地面，现在在地面）
                    if (!wasOnGround) {
                        player.landingCount++;
                        
                        // 第一次着陆显示 "Emily Coming"
                        if (player.landingCount === 1) {
                            this.landingMessage.show = true;
                            this.landingMessage.opacity = 1;
                            this.landingMessage.duration = 120; // 显示120帧（约2秒）
                            this.landingMessage.text = 'Emily Coming';
                        }
                        // 第二次着陆显示 "Coming, buddy!"
                        else if (player.landingCount === 2) {
                            this.landingMessage.show = true;
                            this.landingMessage.opacity = 1;
                            this.landingMessage.duration = 120;
                            this.landingMessage.text = 'Coming, buddy!';
                        }
                    }
                }
                // 从下方撞击
                else if (player.velocityY < 0 && player.y - player.velocityY >= platform.y + platform.height) {
                    player.y = platform.y + platform.height;
                    player.velocityY = 0;
                }
            }
        });
        
        // 碰撞检测 - 砖块
        this.bricks.forEach(brick => {
            if (brick.active && this.checkCollision(player, brick)) {
                // 从下方撞击砖块
                if (player.velocityY < 0 && player.y - player.velocityY >= brick.y + brick.height) {
                    if (player.isBig) {
                        brick.active = false;
                        this.score += 50;
                        this.createParticles(brick.x + brick.width / 2, brick.y, '#8B4513');
                    }
                    player.velocityY = 1;
                }
            }
        });
        
        // 碰撞检测 - 问号方块
        this.questionBlocks.forEach(block => {
            if (block.active && this.checkCollision(player, block)) {
                // 从下方撞击
                if (player.velocityY < 0 && player.y - player.velocityY >= block.y + block.height) {
                    this.hitQuestionBlock(block);
                    player.velocityY = 1;
                }
            }
        });
        
        // 防止掉出屏幕底部
        if (player.y > this.canvas.height) {
            this.loseLife();
        }
        
        // 限制向左移动
        if (player.x < 0) {
            player.x = 0;
        }
    }
    
    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            // 移动
            enemy.x += enemy.velocityX;
            
            // 简单的地面检测
            let onGround = false;
            this.platforms.forEach(platform => {
                if (enemy.x + enemy.width > platform.x && 
                    enemy.x < platform.x + platform.width &&
                    enemy.y + enemy.height >= platform.y && 
                    enemy.y + enemy.height <= platform.y + 20) {
                    onGround = true;
                }
            });
            
            // 转向逻辑
            if (enemy.x < this.camera.x - 100 || enemy.x > this.camera.x + this.canvas.width + 100) {
                return;
            }
            
            // 撞墙转向
            this.platforms.forEach(platform => {
                if (this.checkCollision(enemy, platform)) {
                    enemy.velocityX *= -1;
                }
            });
            
            // 与玩家碰撞
            if (this.checkCollision(this.player, enemy)) {
                // 踩头
                if (this.player.velocityY > 0 && this.player.y + this.player.height - this.player.velocityY <= enemy.y + 10) {
                    enemy.alive = false;
                    this.player.velocityY = -8;
                    this.score += 100;
                    this.enemiesKilled++;
                    this.createParticles(enemy.x + enemy.width / 2, enemy.y, '#8B4513');
                } else if (!this.player.isInvincible) {
                    // 受伤
                    if (this.player.isBig) {
                        this.player.isBig = false;
                        this.player.height = 32;
                        this.player.isInvincible = true;
                        setTimeout(() => this.player.isInvincible = false, 2000);
                    } else {
                        this.loseLife();
                    }
                }
            }
        });
    }
    
    updateItems() {
        this.items.forEach((item, index) => {
            item.x += item.velocityX;
            item.y += item.velocityY;
            item.velocityY += this.gravity;
            
            // 平台碰撞
            this.platforms.forEach(platform => {
                if (this.checkCollision(item, platform)) {
                    if (item.velocityY > 0) {
                        item.y = platform.y - item.height;
                        item.velocityY = 0;
                    }
                }
            });
            
            // 与玩家碰撞
            if (this.checkCollision(this.player, item)) {
                if (item.type === 'mushroom') {
                    this.player.isBig = true;
                    this.player.height = 48;
                    this.score += 1000;
                } else if (item.type === 'star') {
                    this.player.isInvincible = true;
                    setTimeout(() => this.player.isInvincible = false, 10000);
                    this.score += 1000;
                }
                this.items.splice(index, 1);
            }
            
            // 移除屏幕外的道具
            if (item.y > this.canvas.height || item.x < this.camera.x - 100) {
                this.items.splice(index, 1);
            }
        });
    }
    
    updateCoinObjects() {
        this.coinObjects.forEach((coin, index) => {
            coin.y += coin.velocityY;
            coin.velocityY += 0.5;
            coin.life--;
            
            if (coin.life <= 0) {
                this.coinObjects.splice(index, 1);
            }
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    updateCamera() {
        // 摄像机跟随玩家
        const targetX = this.player.x - this.canvas.width / 3;
        this.camera.x = Math.max(0, targetX);
        
        // 限制摄像机不超过关卡范围
        const maxCameraX = 7500 - this.canvas.width;
        this.camera.x = Math.min(this.camera.x, maxCameraX);
    }
    
    checkFlagPole() {
        if (this.flagPole && !this.flagPole.reached) {
            if (this.player.x >= this.flagPole.x) {
                this.flagPole.reached = true;
                this.gameOver(true);
            }
        }
    }
    
    hitQuestionBlock(block) {
        if (!block.active) return;
        
        block.active = false;
        block.bounce = 20;
        
        if (block.content === 'coin') {
            this.coins++;
            this.score += 200;
            
            // 创建跳跃的金币动画
            this.coinObjects.push({
                x: block.x + block.width / 2,
                y: block.y,
                velocityY: -8,
                life: 30
            });
        } else if (block.content === 'mushroom') {
            this.items.push({
                x: block.x,
                y: block.y - 40,
                width: 32,
                height: 32,
                velocityX: 2,
                velocityY: 0,
                type: 'mushroom'
            });
        }
        
        // 每100个金币加1条命
        if (this.coins >= 100) {
            this.coins -= 100;
            this.lives++;
        }
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 30,
                color: color
            });
        }
    }
    
    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制天空
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#5c94fc');
        gradient.addColorStop(1, '#ffffff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制云朵
        this.drawClouds();
        
        // 保存上下文并应用摄像机偏移
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // 绘制地面和平台
        this.drawPlatforms();
        
        // 绘制砖块
        this.drawBricks();
        
        // 绘制问号方块
        this.drawQuestionBlocks();
        
        // 绘制敌人
        this.drawEnemies();
        
        // 绘制道具
        this.drawItems();
        
        // 绘制金币动画
        this.drawCoinObjects();
        
        // 绘制粒子
        this.drawParticles();
        
        // 绘制旗杆
        this.drawFlagPole();
        
        // 绘制玩家
        this.drawPlayer();
        
        // 恢复上下文
        this.ctx.restore();
        
        // 绘制着陆消息（在恢复上下文之后，不受摄像机影响）
        if (this.landingMessage.show) {
            this.ctx.save();
            this.ctx.globalAlpha = this.landingMessage.opacity;
            
            // 绘制背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(this.canvas.width / 2 - 250, this.canvas.height / 2 - 60, 500, 120);
            
            // 绘制文字
            this.ctx.fillStyle = '#FFD700';
            this.ctx.strokeStyle = '#FF69B4';
            this.ctx.lineWidth = 4;
            this.ctx.font = 'bold 60px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // 文字描边
            this.ctx.strokeText(this.landingMessage.text, this.canvas.width / 2, this.canvas.height / 2);
            // 文字填充
            this.ctx.fillText(this.landingMessage.text, this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.restore();
        }
        
        // 更新HUD
        this.updateHUD();
    }
    
    drawClouds() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
            const x = (i * 300 - this.camera.x * 0.5) % (this.canvas.width + 200);
            const y = 100 + i * 50;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 30, 0, Math.PI * 2);
            this.ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
            this.ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPlatforms() {
        this.platforms.forEach(platform => {
            if (platform.x + platform.width < this.camera.x - 100 || 
                platform.x > this.camera.x + this.canvas.width + 100) {
                return;
            }
            
            if (platform.type === 'ground') {
                // 草地
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(platform.x, platform.y, platform.width, 5);
            } else {
                // 砖块平台
                this.ctx.fillStyle = '#D2691E';
                this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
            }
        });
    }
    
    drawBricks() {
        this.bricks.forEach(brick => {
            if (!brick.active) return;
            
            this.ctx.fillStyle = '#CD853F';
            this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // 砖块纹理
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            this.ctx.strokeRect(brick.x + brick.width / 2, brick.y, brick.width / 2, brick.height / 2);
            this.ctx.strokeRect(brick.x, brick.y + brick.height / 2, brick.width / 2, brick.height / 2);
        });
    }
    
    drawQuestionBlocks() {
        this.questionBlocks.forEach(block => {
            const y = block.y - block.bounce;
            
            if (block.active) {
                // 活跃的问号方块
                this.ctx.fillStyle = '#FFD700';
                this.ctx.fillRect(block.x, y, block.width, block.height);
                this.ctx.strokeStyle = '#FFA500';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(block.x, y, block.width, block.height);
                
                // 问号
                this.ctx.fillStyle = '#8B4513';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', block.x + block.width / 2, y + block.height / 2);
            } else {
                // 已使用的方块
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(block.x, y, block.width, block.height);
                this.ctx.strokeStyle = '#654321';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(block.x, y, block.width, block.height);
            }
        });
    }
    
    drawEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            // 老鼠敌人
            // 身体
            this.ctx.fillStyle = '#808080';
            this.ctx.beginPath();
            this.ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, enemy.height / 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 头
            this.ctx.fillStyle = '#808080';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + enemy.width / 2, enemy.y + 10, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 耳朵
            this.ctx.fillStyle = '#A9A9A9';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + 8, enemy.y + 6, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + 24, enemy.y + 6, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 眼睛
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + 12, enemy.y + 10, 2, 0, Math.PI * 2);
            this.ctx.arc(enemy.x + 20, enemy.y + 10, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 鼻子
            this.ctx.fillStyle = '#FFB6C1';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + 16, enemy.y + 12, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 尾巴
            this.ctx.strokeStyle = '#808080';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.x + 28, enemy.y + enemy.height - 8);
            this.ctx.lineTo(enemy.x + 34, enemy.y + enemy.height - 4);
            this.ctx.stroke();
        });
    }
    
    drawItems() {
        this.items.forEach(item => {
            if (item.type === 'mushroom') {
                // 包子
                this.ctx.fillStyle = '#FFE4C4';
                this.ctx.beginPath();
                this.ctx.ellipse(item.x + 16, item.y + 20, 14, 10, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 包子顶部
                this.ctx.fillStyle = '#F5DEB3';
                this.ctx.beginPath();
                this.ctx.ellipse(item.x + 16, item.y + 12, 12, 8, 0, Math.PI, 0, true);
                this.ctx.fill();
                
                // 包子褶皱
                this.ctx.strokeStyle = '#DEB887';
                this.ctx.lineWidth = 1.5;
                for (let i = 0; i < 5; i++) {
                    this.ctx.beginPath();
                    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
                    const x = item.x + 16 + Math.cos(angle) * 5;
                    const y = item.y + 12 + Math.sin(angle) * 3;
                    this.ctx.moveTo(item.x + 16, item.y + 12);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                }
                
                // 包子轮廓
                this.ctx.strokeStyle = '#DEB887';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.ellipse(item.x + 16, item.y + 20, 14, 10, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (item.type === 'star') {
                // 星星
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '30px Arial';
                this.ctx.fillText('⭐', item.x, item.y + 30);
            }
        });
    }
    
    drawCoinObjects() {
        this.coinObjects.forEach(coin => {
            // 绘制一大束竹子
            const bambooCount = 5; // 5根竹子组成一束
            
            for (let i = 0; i < bambooCount; i++) {
                const offset = (i - 2) * 4; // 左右排列
                const height = 25 + Math.random() * 5;
                
                // 竹竿
                this.ctx.fillStyle = '#90EE90';
                this.ctx.fillRect(coin.x + offset - 2, coin.y - height, 4, height);
                
                // 竹节
                this.ctx.strokeStyle = '#228B22';
                this.ctx.lineWidth = 1;
                for (let j = 0; j < 3; j++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(coin.x + offset - 2, coin.y - height + j * 8);
                    this.ctx.lineTo(coin.x + offset + 2, coin.y - height + j * 8);
                    this.ctx.stroke();
                }
                
                // 竹叶
                this.ctx.fillStyle = '#228B22';
                for (let k = 0; k < 3; k++) {
                    const leafY = coin.y - height + k * 6;
                    // 左边叶子
                    this.ctx.beginPath();
                    this.ctx.ellipse(coin.x + offset - 5, leafY, 4, 2, -Math.PI / 4, 0, Math.PI * 2);
                    this.ctx.fill();
                    // 右边叶子
                    this.ctx.beginPath();
                    this.ctx.ellipse(coin.x + offset + 5, leafY, 4, 2, Math.PI / 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            // 绑绳（把竹子捆在一起）
            this.ctx.strokeStyle = '#8B4513';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(coin.x - 10, coin.y - 15);
            this.ctx.lineTo(coin.x + 10, coin.y - 15);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(coin.x - 10, coin.y - 12);
            this.ctx.lineTo(coin.x + 10, coin.y - 12);
            this.ctx.stroke();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, 4, 4);
        });
    }
    
    drawFlagPole() {
        if (!this.flagPole) return;
        
        // 旗杆
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(this.flagPole.x, this.flagPole.y, this.flagPole.width, this.flagPole.height);
        
        // 旗帜
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(this.flagPole.x + this.flagPole.width, this.flagPole.y);
        this.ctx.lineTo(this.flagPole.x + this.flagPole.width + 40, this.flagPole.y + 15);
        this.ctx.lineTo(this.flagPole.x + this.flagPole.width, this.flagPole.y + 30);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawPlayer() {
        const p = this.player;
        const flickering = this.player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0;
        
        if (flickering) return;
        
        // 显示熊猫名字 "Emily"
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText('Emily', p.x + 16, p.y - 5);
        
        // 熊猫身体
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 16, p.y + p.height - 12, 14, 12, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 熊猫头
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(p.x + 16, p.y + 14, 13, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 熊猫耳朵（黑色圆形）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(p.x + 7, p.y + 6, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 25, p.y + 6, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 黑眼圈
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 11, p.y + 13, 5, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 21, p.y + 13, 5, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 眼睛（白色）
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(p.x + 11, p.y + 13, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 21, p.y + 13, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 眼珠（黑色）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(p.x + 11, p.y + 13, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 21, p.y + 13, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 眼睛高光
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(p.x + 11.5, p.y + 12.5, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 21.5, p.y + 12.5, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 鼻子（黑色）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 16, p.y + 18, 3, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 嘴巴
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x + 16, p.y + 18);
        this.ctx.lineTo(p.x + 16, p.y + 21);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 13, p.y + 21, 3, 0, Math.PI / 2);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(p.x + 19, p.y + 21, 3, Math.PI / 2, Math.PI);
        this.ctx.stroke();
        
        // 手臂（黑色）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 6, p.y + p.height - 14, 5, 8, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 26, p.y + p.height - 14, 5, 8, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 腿（黑色）
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 10, p.y + p.height - 5, 5, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 22, p.y + p.height - 5, 5, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 脚掌（白色肉垫效果）
        this.ctx.fillStyle = '#FFB6C1';
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 10, p.y + p.height - 3, 3, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(p.x + 22, p.y + p.height - 3, 3, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    updateHUD() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('coinsValue').textContent = this.coins;
        document.getElementById('timeValue').textContent = this.time;
        document.getElementById('livesValue').textContent = `❤️ × ${this.lives}`;
        document.getElementById('worldValue').textContent = this.world;
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// 启动游戏
const game = new SuperMarioGame();
