class Task1 {
  constructor() {
    this.bgColour = 220;
    this.currentImageIndex = 0;
    this.imageLoaded = false;
    this.processed_image = [];

    this.targetTime = 0;
    this.waitDuration = 3000;
    this.fadeDuration = 500;
    this.timerStarted = false;

    this.animationStarted = false;
    this.transitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = 0;
    this.transitionTo = 0;
    this.holdStartTime = 0;
    
    this.thresholdSlider = createSlider(0, 255, 110, 1);
    this.thresholdSlider.position(150, 25);
  }

  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }

  loadImages() {
    this.processed_image = [];
    for (let i = 0; i < task1_images.length; i++) {
      let cleaned = this.applyThreshold(task1_images[i], thresholds[i]);
      this.processed_image.push(cleaned);
    }
    this.imageLoaded = true;
  }

  startAnimation() {
    this.transitioning = false;
    this.animationStarted = true;

    this.timerStarted = true;
    this.holdStartTime = millis();
    this.targetTime = this.holdStartTime + this.waitDuration;
  }

  startTransition() {
    this.transitioning = true;
    this.transitionStart = millis();
    this.transitionFrom = this.currentImageIndex;
    this.transitionTo = (this.currentImageIndex + 1) % this.processed_image.length;
  }

  draw() {
    background(this.bgColour);
    fill("#34ebe1");

    if (this.imageLoaded && this.processed_image.length > 0) {
      let currentImage = this.processed_image[this.currentImageIndex];

      // FADE IN & OUT LOGIC
      if (this.animationStarted && this.transitioning) {
        this.animateFade();
      
      // ZOOM IN & OUT LOGIC
      } else {
        this.animateZoom();
      }
    }

    if (this.animationStarted && !this.transitioning) {
      if (millis() >= this.targetTime) {
        this.startTransition();
      }
    }

    text("Task 1", 50, 50);
    if (this.thresholdSlider) {
      text(this.thresholdSlider.value(), 350, 50);
    }
    this.drawModeSelection();
  }  

  animateFade() {
    let now = millis();
    let elapsed = constrain(now - this.transitionStart, 0, this.fadeDuration);
    let alphaNext = map(elapsed, 0, this.fadeDuration, 0, 255);
    let alphaCurrent = 255 - alphaNext;

    let fromImage = this.processed_image[this.transitionFrom];
    let toImage = this.processed_image[this.transitionTo];

    // Base unscaled bounds
    let fromScale = min(width / fromImage.width, height / fromImage.height);
    let fromBaseW = fromImage.width * fromScale;
    let fromBaseH = fromImage.height * fromScale;

    let toScale = min(width / toImage.width, height / toImage.height);
    let toBaseW = toImage.width * toScale;
    let toBaseH = toImage.height * toScale;

    // Keep fromImage's latest zoom factor
    let wasFromEven = (this.transitionFrom % 2 === 0);
    let fromEndZoom = wasFromEven ? 1.4 : 0.7;
    let fromW = fromBaseW * fromEndZoom;
    let fromH = fromBaseH * fromEndZoom;
    let fromX = (width - fromW) / 2;
    let fromY = (height - fromH) / 2;

    // toImage always fades in at original size (1.0)
    let toW = toBaseW * 1.0;
    let toH = toBaseH * 1.0;
    let toX = (width - toW) / 2;
    let toY = (height - toH) / 2;

    push();
    tint(255, alphaCurrent);
    image(fromImage, fromX, fromY, fromW, fromH);

    tint(255, alphaNext);
    image(toImage, toX, toY, toW, toH);
    pop();

    if (elapsed >= this.fadeDuration) {
      this.transitioning = false;
      this.currentImageIndex = this.transitionTo;

      // Hold the image for a moment
      this.holdStartTime = millis();
      this.targetTime = this.holdStartTime + this.waitDuration;
    }
  }

  animateZoom() {
    let currentImage = this.processed_image[this.currentImageIndex];

    let baseScale = min(width / currentImage.width, height / currentImage.height);
    let baseW = currentImage.width * baseScale;
    let baseH = currentImage.height * baseScale;

    // Calculate progress from holdStartTime
    let holdStart = this.holdStartTime || (this.targetTime - this.waitDuration);
    let timeInState = millis() - holdStart;
    let progress = constrain(timeInState / this.waitDuration, 0, 1);

    // Determine target zoom (in / out) based on index
    let isEvenIndex = (this.currentImageIndex % 2 === 0);
    let startZoom = 1.0;
    let endZoom = isEvenIndex ? 1.4 : 0.7;

    // Smoothly interpolate current zoom level
    let zoomFactor = lerp(startZoom, endZoom, progress);

    let zoomW = baseW * zoomFactor;
    let zoomH = baseH * zoomFactor;
    let zoomX = (width - zoomW) / 2;
    let zoomY = (height - zoomH) / 2;

    image(currentImage, zoomX, zoomY, zoomW, zoomH);
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
