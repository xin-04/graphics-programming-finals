class Task1 {
  constructor() {
    this.bgColour = 220;
    this.currentImageIndex = 0;
    this.imageLoaded = false;
    this.processed_image = [];

    this.targetTime = 0;
    this.waitDuration = 2000;
    this.timerStarted = false;
    this.animationStarted = false;

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

      let scale = min(width / currentImage.width, height / currentImage.height);
      let w = currentImage.width * scale;
      let h = currentImage.height * scale;

      image(currentImage, 0, 0, w, h);
    }

    if (this.animationStarted) {
      if (millis() >= this.targetTime) {
        this.currentImageIndex = (this.currentImageIndex + 1) % task1_images.length;
        this.targetTime = millis() + this.waitDuration;
      }
    }

    text("Task 1", 50, 50);
    text(this.thresholdSlider.value(), 350, 50);
    this.drawModeSelection();
  }

  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }

  drawModeSelection() {
    let panelX = width - 235;
    let panelY = 10;
    let panelW = 215;
    let panelH = 160;

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

  applyThreshold(img, thresholds) {
    let colourSpace = thresholds[0];
    let targetA = thresholds[1];
    let targetB = thresholds[2];
    let targetC = thresholds[3];
    let thresholdVal = thresholds[4];
    let featherRange = 30;

    let imgOut = createImage(img.width, img.height);
    imgOut.loadPixels();
    img.loadPixels();

    for (let x = 0; x < imgOut.width; x++) {
      for (let y = 0; y < imgOut.height; y++) {
        let index = (x + y * imgOut.width) * 4;

        let r = img.pixels[index + 0];
        let g = img.pixels[index + 1];
        let b = img.pixels[index + 2];
        let originalA = img.pixels[index + 3];

        let diff;

        if (colourSpace === 1) {
          colorMode(HSB, 360, 100, 100);
          let c = color(r, g, b);
          let h = hue(c);
          let s = saturation(c);
          let br = brightness(c);
          diff = dist(h, s, br, targetA, targetB, targetC);
        } else {
          colorMode(RGB, 255);
          diff = dist(r, g, b, targetA, targetB, targetC);
        }

        imgOut.pixels[index + 0] = r;
        imgOut.pixels[index + 1] = g;
        imgOut.pixels[index + 2] = b;

        if (diff < thresholdVal) {
          imgOut.pixels[index + 3] = 0;
        } else if (diff < thresholdVal + featherRange) {
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
