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
  if (keyCode === 83 && currentMenu === 0 && task1.imageLoaded) {
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
    this.imageLoaded = false;

    // ANIMATION
    this.targetTime = 0;
    this.waitDuration = 2000; // Wait 2 seconds
    this.timerStarted = false;
    this.animationStarted = false;

    // THRESHOLD
    this.thresholdApplied = false;
    this.thresholdSlider = createSlider(0, 255, 110);
    this.thresholdSlider.position(150, 50);
  }

  draw() {
    background(this.bgColour);
    fill("#34ebe1");

    if (this.imageLoaded) {
      let currentImage = task1_images[this.currentImageIndex];
      let imgOut = this.applyThreshold(currentImage);

      // Calculate the scale factor to fit the canvas bounds
      let scale = min(width / imgOut.width, height / imgOut.height);
      let w = imgOut.width * scale;
      let h = imgOut.height * scale;

      image(imgOut, 0, 0, w, h);
    }

    if (this.animationStarted) {
      // Wait 2 seconds before moving on to the next picture
      if (millis() >= this.targetTime) {
        this.currentImageIndex = (this.currentImageIndex + 1) % task1_images.length;
        this.targetTime = millis() + this.waitDuration;
      }
    }

    text("Task 1", 50, 50);
    text(this.thresholdSlider.value(), 350, 50);
    this.drawModeSelection();

  }

  // TODO: make a more interesting backdrop
  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }

  loadImages() {
    this.imageLoaded = true;
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
    // Start timer
    this.targetTime = millis() + this.waitDuration;
    this.timerStarted = true;
    this.animationStarted = true;
  }

  pauseAnimation() {
    // Pause timer
    this.targetTime = 0;
    this.timerStarted = false;
    this.animationStarted = false;
  }

  applyThreshold(img) {
    let imgOut = createImage(img.width, img.height);
    imgOut.loadPixels();
    img.loadPixels();

    // Remove target background colour (white)
    let targetR = 255;
    let targetG = 255;
    let targetB = 255;

    for (let x = 0; x < imgOut.width; x++) {
      for (let y = 0; y < imgOut.height; y++) {

        var index = (x + y * imgOut.width) * 4;

        var r = img.pixels[index + 0];
        var g = img.pixels[index + 1];
        var b = img.pixels[index + 2];

        // Calculate colour istance from the target background colour
        let diff = dist(r, g, b, targetR, targetG, targetB);
        
        let threshold = this.thresholdSlider.value();

        if (diff < threshold) {
          // Make transparent if close to the target colour
          imgOut.pixels[index + 3] = 0;
        } else {
          // Otherwise, make fully opaque
          imgOut.pixels[index + 3] = 255;
          imgOut.pixels[index + 4] = r;
          imgOut.pixels[index + 5] = g;
          imgOut.pixels[index + 6] = b;
        }
      }
    }
    imgOut.updatePixels();
    return imgOut;
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