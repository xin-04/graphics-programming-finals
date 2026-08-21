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

function setup() {
  createCanvas(1200, 720);
  textSize(24);

  task1 = new Task1();
  task2 = new Task2();
  currentMenu = 1;
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
  if (keyCode === 49) {
    currentMenu = 0;
  }

  if (keyCode === 50) {
    currentMenu = 1;
  }

  if (keyCode === 67 && currentMenu === 0) {
    task1.loadCarousel();
  }

  if (keyCode === 76 && currentMenu === 0) {
    task1.loadImages();
  }

  if (keyCode === 83 && currentMenu === 0 && task1.imageLoaded) {
    task1.startAnimation();
  }

  if (keyCode === 80 && currentMenu === 0 && task1.animationStarted) {
    task1.pauseAnimation();
  }

  if (keyCode === 82 && currentMenu === 0 && task1.imageLoaded) {
    thresholds[task1.currentImageIndex][0] = 0;
    task1.processed_image[task1.currentImageIndex] = task1.applyThreshold(
      task1_images[task1.currentImageIndex],
      thresholds[task1.currentImageIndex]
    );
    console.log("Apply RGB threshold");
  }

  if (keyCode === 72 && currentMenu === 0 && task1.imageLoaded) {
    thresholds[task1.currentImageIndex][0] = 1;
    task1.processed_image[task1.currentImageIndex] = task1.applyThreshold(
      task1_images[task1.currentImageIndex],
      thresholds[task1.currentImageIndex]
    );
    console.log("Apply HSB threshold");
  }

  // ================= TASK 2 ==================
  if (keyCode === 80 && currentMenu === 1) {
    task2.loadPanorama();
  }

  if (keyCode === 73 && currentMenu === 1) {
    task2.loadImages();
  }

  if (keyCode === 83 && currentMenu === 1 && task2.imageLoaded) {
    task2.startAnimation();
  }

  if (keyCode === 80 && currentMenu === 1 && task2.animationStarted) {
    task2.pauseAnimation();
  }
}
