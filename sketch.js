var task1;
var task2;
var currentMenu;

var task1_images = [];
var task2_images = [];

function setup() {
  createCanvas(1200, 720);
  textSize(24);

  task1 = new Task1();
  task2 = new Task2();
  currentMenu = 0;

}

function preload() {
  for (let i = 1; i < 9; i++) {
    let img = loadImage(`assets/task1/${i}.jpg`);
    task1_images.push(img);
  }

  for (let i = 1; i < 9; i++) {
    for (let j = 1; j < 3; j++) {
      let img = loadImage(`assets/task2/pair${i}_${j}.png`);
      task2_images.push(img);
    }
  }
}

function draw() {

  if (currentMenu === 0) {
    task1.draw();
  }

  if (currentMenu === 1) {
    task2.draw();
  }
}

function keyPressed() {
  // Key '1'
  if (keyCode === 49) {
    currentMenu = 0;
  }

  // Key '2'
  if (keyCode === 50) {
    currentMenu = 1;
  }

  // TASK 1
  // Key 'c': load carousel
  if (keyCode === 67 && currentMenu === 0) {
    task1.loadCarousel();
  }

  // Key 'l': load images
  if (keyCode === 76 && currentMenu === 0) {
    task1.loadImages();
  }

  // Key 's': start animation
  if (keyCode === 83 && currentMenu === 0 && task1.imageIsLoaded) {
    task1.startAnimation();
  }

  // Key 'p': pause animation
  if (keyCode === 80 && currentMenu === 0 && task1.animationStarted) {
    task1.pauseAnimation();
  }

}

class Task1 {
  constructor() {
    this.bgColour = 220;
    this.currentImageIndex = 0;
    this.imageIsLoaded = false;

    this.targetTime = 0;
    this.waitDuration = 2000; // Wait 2 seconds
    this.timerStarted = false;  // Prevent timer from starting too early
    
    this.animationStarted = false;
  }

  draw() {
    background(this.bgColour);
    fill(255);
    text("Task 1", 50, 50);

    this.drawModeSelection();

    if (this.imageIsLoaded) {
      let currentImage = task1_images[this.currentImageIndex];

      // Calculate the scale factor to fit the canvas bounds
      let scale = min(width / currentImage.width, height / currentImage.height);
      let w = currentImage.width * scale;
      let h = currentImage.height * scale;

      image(currentImage, 0, 0, w, h);
    }

    if (this.animationStarted) {
      // Wait 2 seconds before moving on to the next picture
      if (millis() >= this.targetTime) {
        this.currentImageIndex = (this.currentImageIndex + 1) % task1_images.length;
        this.targetTime = millis() + this.waitDuration;
      }
    }
  }

  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }

  loadImages() {
    this.imageIsLoaded = true;
  }

  drawModeSelection() {
    let panelX = width - 235;
    let panelY = 10;
    let panelW = 215;
    let panelH = 120;
    let buttonW = 180;
    let buttonH = 28;

    push();
    rectMode(CORNER);
    textAlign(LEFT, CENTER);

    fill(20, 20, 20);
    stroke(255, 220);
    strokeWeight(1.2);
    rect(panelX, panelY, panelW, panelH, 16);

    noStroke();
    fill(255, 235, 180);
    textSize(16);
    textStyle(BOLD);
    text("Key Commands", panelX + 14, panelY + 20);
    text("c: load the carousel", panelX + 14, panelY + 40);
    text("l: load images", panelX + 14, panelY + 60);
    text("s: start animation", panelX + 14, panelY + 80);
    text("p: pause animation", panelX + 14, panelY + 100);


    pop();
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
  }

  startAnimation() {
    this.targetTime = millis() + this.waitDuration;
    this.timerStarted = true;
    this.animationStarted = true;
  }

  pauseAnimation() {
    this.targetTime = 0;
    this.timerStarted = false;
    this.animationStarted = false;
  }

  applyThreshold() {
    
  }
}

class Task2 {
  constructor() {

  }

  draw() {
    background(240);
    fill(0);
    text("Task 2", 50, 50);
  }
}