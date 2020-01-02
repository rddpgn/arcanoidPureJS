"use strict";
/*
    Класс, определяющий форму каждого игрового объекта
*/

class Sprite {
    constructor(width = 32, height = 32) {
        this.width = width;
        this.height = height;
    }
}

/*
    Класс, определяющий каждый игровой объект. Игровые объекты - объекты, которые мы
    видим непосредственно в процессе игры (мяч, доска, кирпичики)
*/
class GameObject {
    constructor(x = 32, y = 32, sprite = new Sprite()) {
        this.x = x;                 
        this.y = y;
        this.sprite = sprite;
        this.destroyed = false;
        
        this.opacity = 0;
        this.opacityDelta = 0.05 + Math.random()/50;
    }
    update() {
        //Плавное появление в начале игры
        if (this.opacity < 1) {
            this.opacity+=this.opacityDelta;
        }
    }
    destroy() {
        this.destroyed = true;
    }
}

class Desk extends GameObject {
    update(game) {
        super.update(game);
        if (game != undefined) {
            //Следование доски за мышью
            let msx = game.mouse_x; 

            //Не дает доске выйти за пределы игрового поля
            if (msx < this.sprite.width / 2) {
                this.x = this.sprite.width / 2;
            } else if (msx > game.gui.canvas.width - this.sprite.width / 2) {
                this.x = game.gui.canvas.width - this.sprite.width / 2;
            } else {
                this.x = msx;
            }
        }
    }
    destroy() {
        //null;
    }
}

class Ball extends GameObject {
    constructor(width, height, sprite) {
        super(width, height, sprite);

        //Начальное направление мяча
        let d = Math.random() * Math.PI * 2;

        this.direction = {
            x: Math.cos(d),
            y: Math.sin(d)
        }

        this.maxSpeed = 8;
        this.speed = 0;
    }
    update(game) {
        super.update(game);

        //Плавное увеличение скорости в начале игры
        if (this.speed < this.maxSpeed) {
            this.speed+=0.1;
        }

        //Перемещение
        this.x += this.direction.x * this.speed;
        this.y += this.direction.y * this.speed;

        //Столкновение с бортиками
        if (this.x + this.direction.x * this.speed < 0) {
            this.direction.x = -this.direction.x;
        }

        if (this.x + this.direction.x * this.speed > game.gui.canvas.width) {
            this.direction.x = -this.direction.x;
        }

        if (this.y + this.direction.y * this.speed < 0) {
            this.direction.y = -this.direction.y;
        }

        if (this.y + this.direction.y * this.speed > game.gui.canvas.height) {
            game.finish(game, 'Game Over');
        }
    }
    //Изменение направления мяча, в связи с ударом с доской
    deskBounce() {
        let d = -(Math.PI * 0.25 + Math.random() * Math.PI * 0.5);

        this.direction.x = Math.cos(d);
        this.direction.y = Math.sin(d);
    }
    //Изменение направления мяча, в случае столкновения с кирпичиком
    bounce() {
        this.direction.x = -this.direction.x;
        this.direction.y = -this.direction.y;
    }
    destroy() {
        //null;
    }
}

class Block extends GameObject {
}

/* 
    Отвечает за создание всех игровых объектов и игрового поля
*/
class GameObjectController {
    constructor(game) {
        this.col = 1;
        this.row = 1;

        //Определение количества столбцов кирпичиков
        while (game.gui.canvas.width / this.col > 32) {
            this.col++;
        }
        //Определение количества строк кирпичиков
        while (game.gui.canvas.height / this.row > 48) {
            this.row++;
        }

        let desk = new Desk(
            game.gui.canvas.width / 2,
            game.gui.canvas.height - 32,
            new Sprite(this.col * 9, 12));

        let ball = new Ball(
            game.gui.canvas.width / 2,
            game.gui.canvas.height / 2,
            new Sprite(12, 12)
        );

        this.props = [];
        this.props.push(desk);
        this.props.push(ball);
        this.desk = this.props[0];
        this.ball = this.props[1];
        this.blocks = 0;

        this.makeLevel(game, this);
    }
    //Создание уровня
    makeLevel(game, gmController) {
        for (let n = 0; n < gmController.col; n++) {
            for (let m = 0; m < gmController.row; m++) {
                let len = game.gui.canvas.width / gmController.col; //Длина кирпичика
                let hei = 0.33 * game.gui.canvas.height / gmController.row; //Ширина кирпичика

                let block = new Block(
                    n * len + len / 2,
                    m * hei + hei / 2,
                    new Sprite(len - 2, hei - 2));
                gmController.props.push(block);
                gmController.blocks++;
            }
        }
    }
}

/*
GUI - отвечает за создание и изменение состояния всех элементов страницы для запуска игры
*/

class GUI {
    constructor() {
        this.createCanvas();
        this.createControlButton();
    }
    
    //Создания канваса для игры
    createCanvas() {
        let canvas = document.createElement('canvas');
        let gameContainer = document.getElementById('arcanoidContainer');
        
        canvas.id = 'arcanoidCanvas';
        gameContainer.appendChild(canvas);

        this.canvas = canvas;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.canvas.pos_x = this.canvas.getBoundingClientRect().left;

        this.ctx = canvas.getContext('2d');
    }

    //Создание кнопки запуска
    createControlButton() {
        let controlButton = document.createElement('button');
        controlButton.id = 'arcanoidControlButton';
        controlButton.innerHTML = 'Start game';
        document.getElementById('arcanoidContainer').appendChild(controlButton);

        this.controlButton = controlButton;
    }

    //Включение/выключение кнопки запуска
    toggleControlButton(gui) {
        gui.controlButton.classList.toggle('hide');
    }
}
/*
    Game - отвечает за создание всех необходимых услових для игры, 
    контроль состояния игры, обновление игровых объектов,
    обработку столкновений игровых объектов, рендер игры, обработку управления
*/
class Game {
    constructor(gui) {
        let game = this;

        this.gui = gui;                                 
        this.mouse_x = 0;   
        this.playingState = false;             

        //Захват управления с мыши
        window.addEventListener('mousemove', function (e) {
            game.mouse_x = e.clientX - game.gui.canvas.pos_x; 
        })

        //Запуск игры через кнопку запуска
        this.gui.controlButton.addEventListener('click', function() {
            if (!game.playingState) {
                game.start(game);
            }
        })
    }

    //Запуск игры, создает все необходимые игровые объекты, запускает игровой цикл, убирает кнопку запуска игры
    start(game) {
        game.playingState = true;
        game.gmController = new GameObjectController(game);
        game.updateInterval = setInterval(function () { game.update(game) }, 20);
        game.gui.toggleControlButton(game.gui);
        
    }

    //Завершение игры, обнуление цикла обновлений объекта, очистка канваса, возварщает кнопку запуска игры
    finish(game, message) {
        game.playingState = false;
        clearInterval(game.updateInterval);
        alert(message);
        game.clearCanvas(game);
        game.gui.toggleControlButton(game.gui);
    }

    /*
        Обновление всех игровых объектов (движение шара и доски, появление кирпичиков)
    */
    update(game) {
        if (game.playingState) {
            let props = Object.values(game.gmController.props);
            for (let i = 0; i < props.length; i++) {
                if (props[i].destroyed === false) {
                    props[i].update(game);
                }       
            }

            game.collision(game);
            game.render(game);
        }
    }

    //Обработка столкновений игровых объектов между собой
    collision(game) {
        let ball = game.gmController.ball;
        let desk = game.gmController.desk;


        /*
            Обработка столкновений шара с каким-либо объектом
            Если на следующем кадре шар и объект пересекутся, то функция возвращает true
            Иначе false
        */
        let isColliding = function (ball, obj) {
            if (ball instanceof Ball && obj instanceof GameObject) {
                if (Math.abs(ball.x + ball.direction.x * ball.speed - obj.x) < Math.abs(ball.sprite.width / 2 + obj.sprite.width / 2)) {
                    if (Math.abs(ball.y + ball.direction.y * ball.speed - obj.y) < Math.abs(ball.sprite.height / 2 + obj.sprite.height / 2)) {
                        return true;
                    }
                }
                return false;
            } else {
                console.log('Invalid parameters')
                return false;
            }
        }

        //Обработка столкновений мяча и доски
        if (isColliding(ball, desk)) {
            ball.deskBounce();
            ball.y = desk.y - desk.sprite.height / 2 - ball.sprite.height / 2;
        }

        //Обработка столкновений кирпичиков и мяча
        let props = Object.values(game.gmController.props);
        for (let i = 2; i < props.length; i++) {
            if (props[i].destroyed === false) {
                if (isColliding(ball, props[i])) {
                    ball.bounce();
                    props[i].destroy();

                    game.gmController.blocks--;
                    if (game.gmController.blocks <= 0) {
                        game.finish(game, 'Congratulations, you won!');
                    }
                }
            }
        }
    }

    //Рендер игровых объектов
    render(game) {
        if (game.playingState) {
            game.gui.ctx.clearRect(0, 0, game.gui.canvas.width, game.gui.canvas.height);

            let props = Object.values(game.gmController.props);
            for (let i = 0; i < props.length; i++) {
                if (props[i].destroyed === false) {
                    game.gui.ctx.fillStyle = `rgba(232,232,232,${props[i].opacity}`;
                    game.gui.ctx.fillRect(
                        props[i].x - props[i].sprite.width / 2,
                        props[i].y - props[i].sprite.height / 2,
                        props[i].sprite.width,
                        props[i].sprite.height);
                }
            }
        }
    }

    clearCanvas(game) {
        game.gui.ctx.clearRect(0, 0, game.gui.canvas.width, game.gui.canvas.height);
    }
}

let game = new Game(new GUI());