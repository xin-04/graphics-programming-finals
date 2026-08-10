var task1;
var task2;
var currentMenu;

var task1_images = [];
var task2_images = [];

function setup(){
  createCanvas(500, 350);
  textSize(24);

  task1 = new Task1();
  task2 = new Task2();
  currentMenu = 0;
}

function preload() {
  for (let i = 1; i < 9; i++){
    let img = loadImage(`assets/task1/${i}.jpg`);
    task1_images.push(img);
  }

  for (let i = 1; i < 9; i++){
    for (let j = 1; j < 3; j++){
      let img = loadImage(`assets/task2/pair${i}_${j}.png`);
      task2_images.push(img);
    }
  }
}

function draw() {
  background(220);

  if (currentMenu === 0) {
    task1.draw();
  }

  if (currentMenu === 1) {
    task2.draw();
  }
}

function keyPressed() {
  // Key '1'
  if(keyCode === 49){
    currentMenu = 0;
  }

  // Key '2'
  if (keyCode === 50) {
    currentMenu = 1;
  }
}

class Task1{
  constructor(){
    
  }

  draw() {
    text("Task 1", 50, 50);
    image(task1_images[0], 0, 0);
  }
}

class Task2{
  constructor(){
    
  }

  draw() {
    text("Task 2", 50, 50);
    image(task2_images[0], 0, 0);
  }
}