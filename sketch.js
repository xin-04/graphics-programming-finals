var task1;
var task2;
var currentMenu;

var task1_images = [];
var task2_images = [];
var thresholds = [];

// TASK1 IMG1
thresholds.push([0, 227, 217, 226, 59]);
// IMG2
thresholds.push([0, 255, 255, 255, 24]);
// IMG3
thresholds.push([0, 239, 234, 240, 58]);
// IMG4
thresholds.push([0, 255, 253, 250, 56]);
// IMG5
thresholds.push([0, 255, 255, 255, 56]);
// IMG6
thresholds.push([0, 250, 251, 253, 28]);
// IMG7
thresholds.push([0, 255, 255, 255, 9]);
// IMG8
thresholds.push([0, 244, 235, 230, 27]);

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

  // Key 'r': switch to RGB
  if (keyCode === 82 && currentMenu === 0 && task1.imageLoaded) {
    // task1.currentThreshold = thresholds[task1.currentImageIndex][0];
    thresholds[task1.currentImageIndex][0] = 0;
    task1.processed_images[task1.currentImageIndex] = task1.applyThreshold(
      task1_images[task1.currentImageIndex],
      thresholds[task1.currentImageIndex]
    );
    console.log("Apply RGB threshold")
  }

  // Key 'h': switch to HSB
  if (keyCode === 72 && currentMenu === 0 && task1.imageLoaded) {
    // task1.currentThreshold = thresholds[task1.currentImageIndex][1];
    thresholds[task1.currentImageIndex][0] = 1;
    task1.processed_images[task1.currentImageIndex] = task1.applyThreshold(
      task1_images[task1.currentImageIndex],
      thresholds[task1.currentImageIndex]
    );
    console.log("Apply HSB threshold");
  }

}

class Task1 {
  constructor() {
    this.bgColour = 220;
    this.currentImageIndex = 0;
    this.imageLoaded = false;
    this.processed_image = [];

    // ANIMATION
    this.targetTime = 0;
    this.waitDuration = 2000; // Wait 2 seconds
    this.timerStarted = false;
    this.animationStarted = false;

    // THRESHOLD
    this.thresholdApplied = false;
    this.thresholdSlider = createSlider(0, 255, 110, 1);
    this.thresholdSlider.position(150, 25);

    this.currentThreshold = thresholds[this.currentImageIndex][0];
  }

  loadImages() {
    this.processed_image = [];
    for (let i = 0; i < task1_images.length; i++) {
      let cleaned = this.applyThreshold(task1_images[i], thresholds[i]);
      this.processed_image.push(cleaned);
    }
    this.imageLoaded = true;
  }

  draw() {
    background(this.bgColour);
    fill("#34ebe1");

    if (this.imageLoaded && this.processed_image.length > 0) {
      let currentImage = this.processed_image[this.currentImageIndex];
      console.log(`Current showing image ${this.currentImageIndex}`);

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

    text("Task 1", 50, 50);
    text(this.thresholdSlider.value(), 350, 50);
    this.drawModeSelection();

  }

  // TODO: make a more interesting backdrop
  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }



  drawModeSelection() {
    let panelX = width - 235;
    let panelY = 10;
    let panelW = 215;
    let panelH = 160;
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
    // text("r: Switch to RGB", panelX + 14, panelY + 120);
    // text("h: Switch to HSB", panelX + 14, panelY + 140);

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

  applyThreshold(img, thresholds) {
    let colourSpace = thresholds[0];

    let imgOut = createImage(img.width, img.height);
    imgOut.loadPixels();
    img.loadPixels();

    // Remove target background colour
    let targetA = thresholds[1];
    let targetB = thresholds[2];
    let targetC = thresholds[3];
    let thresholdVal = thresholds[4];
    // let threshold = this.thresholdSlider.value();

    let featherRange = 30;

    for (let x = 0; x < imgOut.width; x++) {
      for (let y = 0; y < imgOut.height; y++) {

        var index = (x + y * imgOut.width) * 4;

        let r = img.pixels[index + 0];
        let g = img.pixels[index + 1];
        let b = img.pixels[index + 2];
        let originalA = img.pixels[index + 3];

        let diff;

        if (colourSpace === 1) {
          colorMode(HSB, 360, 100, 100)
          let c = color(r, g, b);
          let h = hue(c);
          let s = saturation(c);
          let br = brightness(c);

          // Calculate distance using HSB values
          diff = dist(h, s, br, targetA, targetB, targetC);
          
        } else {
          colorMode(RGB, 255);
          // Calculate distance using standard RGB values
          diff = dist(r, g, b, targetA, targetB, targetC);
        }

        imgOut.pixels[index + 0] = r;
        imgOut.pixels[index + 1] = g;
        imgOut.pixels[index + 2] = b;

        if (diff < thresholdVal) {
          // Make pixel transparent
          imgOut.pixels[index + 3] = 0;
        } else if (diff < thresholdVal + featherRange) {
          // Keep original pixel colors and make fully opaque
          imgOut.pixels[index + 3] = originalA;
        } else {
          let alphaProgress = (diff - thresholdVal) / featherRange;
          imgOut.pixels[index + 3] = originalA * alphaProgress;
        }
      }
    }
    imgOut.updatePixels();
    return imgOut;
  }

  cleanImageEdges(img, thresholds) {
    
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