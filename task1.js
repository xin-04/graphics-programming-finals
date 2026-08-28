class Task1 {
  constructor() {
    this.bgColour = 220;
    this.currentImageIndex = 0;
    this.imageLoaded = false;
    this.processed_image = [];
    this.imageTrims = [];

    this.targetTime = 0;
    this.waitDuration = 5000;
    this.fadeDuration = 500;
    this.timerStarted = false;

    this.animationStarted = false;
    this.transitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = 0;
    this.transitionTo = 0;
    this.holdStartTime = 0;
    this.panProgress = 0;
    
    this.thresholdSlider = createSlider(0, 255, 110, 1);
    this.thresholdSlider.position(150, 25);
  }

  loadCarousel() {
    this.bgColour = color(0, 50, 100);
  }

  loadImages() {
    this.processed_image = [];
    this.imageTrims = [];
    for (let i = 0; i < task1_images.length; i++) {
      let cleaned = this.applyThreshold(task1_images[i], thresholds[i]);
      this.processed_image.push(cleaned);
      this.imageTrims.push(this.computeVisibleTrim(cleaned));
    }
    this.imageLoaded = true;
  }

  startAnimation() {
    this.transitioning = false;
    this.animationStarted = true;

    this.timerStarted = true;
    this.holdStartTime = millis();
    this.targetTime = this.holdStartTime + this.waitDuration;
    this.panProgress = 0;
  }

  startTransition() {
    this.transitioning = true;
    this.transitionStart = millis();
    this.transitionFrom = this.currentImageIndex;
    this.transitionTo = (this.currentImageIndex + 1) % this.processed_image.length;
    this.panProgress = 0;
  }

  draw() {
    background(this.bgColour);
    fill("#34ebe1");
    imageMode(CORNER);

    if (this.imageLoaded && this.processed_image.length > 0) {
      console.log(`Image index ${this.currentImageIndex}`);
      // FADE IN & OUT LOGIC
      if (this.animationStarted && this.transitioning) {
        this.animateFade();
      // ZOOM IN & OUT LOGIC
      } else {
        this.animateZoom();
      }
    }

    this.updateAnimationTimer();
    this.drawOverlayUI();
  }  

  // panProgress (0.0 = left edge, 1.0 = right edge)
  getFittedBounds(img, zoomFactor = 1.0, panProgress = 0.0, forceLeft = false, trim = { left: 0, right: 0 }) {
    let baseScale = min(width / img.width, height / img.height);
    let w = img.width * baseScale * zoomFactor;
    let h = img.height * baseScale * zoomFactor;

    let leftTrim = trim.left || 0;
    let rightTrim = trim.right || 0;
    let visibleWidth = max(0, img.width - leftTrim - rightTrim) * baseScale * zoomFactor;

    let startX = -leftTrim * baseScale * zoomFactor;
    let endX = width - visibleWidth - leftTrim * baseScale * zoomFactor;

    let progress = constrain(panProgress, 0, 1);
    let x;
    if (forceLeft || progress <= 0.001) {
      x = startX;
    } else {
      x = lerp(startX, endX, progress);
    }

    let y = (height - h) / 2;
    return { x, y, w, h };
  }

  animateFade() {
    imageMode(CORNER);
    let elapsed = constrain(millis() - this.transitionStart, 0, this.fadeDuration);
    let alphaNext = map(elapsed, 0, this.fadeDuration, 0, 255);
    let alphaCurrent = 255 - alphaNext;

    let fromImg = this.processed_image[this.transitionFrom];
    let toImg = this.processed_image[this.transitionTo];

    // fromImg will keep its zoom level when exiting
    let wasFromEven = (this.transitionFrom % 2 === 0);
    let fromEndZoom = wasFromEven ? 1.4 : 0.7;

    let fromTrim = this.imageTrims[this.transitionFrom] || { left: 0, right: 0 };
    let toTrim = this.imageTrims[this.transitionTo] || { left: 0, right: 0 };

    // fromImg will end animation on the right side
    let fromBounds = this.getFittedBounds(fromImg, fromEndZoom, 1.0, false, fromTrim);

    // toImg always starts on the left side, explicitly anchoring visible content
    let toBounds = this.getFittedBounds(toImg, 1.0, 0.0, true, toTrim);

    push();
    tint(255, alphaCurrent);
    image(fromImg, fromBounds.x, fromBounds.y, fromBounds.w, fromBounds.h);

    tint(255, alphaNext);
    image(toImg, toBounds.x, toBounds.y, toBounds.w, toBounds.h);
    pop();

    if (elapsed >= this.fadeDuration) {
      this.transitioning = false;
      this.currentImageIndex = this.transitionTo;
      this.holdStartTime = millis();
      this.panProgress = 0;
      this.targetTime = this.holdStartTime + this.waitDuration;
    }
  }

  animateZoom() {
    imageMode(CORNER);
    let currentImage = this.processed_image[this.currentImageIndex];
    let currentTrim = this.imageTrims[this.currentImageIndex] || { left: 0, right: 0 };

    // Calculate progress from holdStartTime
    if (!this.holdStartTime) {
      this.holdStartTime = millis();
    }
    this.panProgress = constrain((millis() - this.holdStartTime) / this.waitDuration, 0, 1);
    let progress = this.panProgress;

    // Determine target zoom (in / out) based on index
    let isEvenIndex = (this.currentImageIndex % 2 === 0);
    let startZoom = 1.0;
    let endZoom = isEvenIndex ? 1.4 : 0.7;
    // Smoothly interpolate current zoom level
    let zoomFactor = lerp(startZoom, endZoom, progress);

    // Moves continuously from left to right while scaling
    let bounds = this.getFittedBounds(currentImage, zoomFactor, progress, progress <= 0.001, currentTrim);
    image(currentImage, bounds.x, bounds.y, bounds.w, bounds.h);
  }

  updateAnimationTimer() {
    if (this.animationStarted && !this.transitioning) {
      if (millis() >= this.targetTime) {
        this.startTransition();
      }
    }
  }

  drawOverlayUI() {
    text("Task 1", 50, 50);
    if (this.thresholdSlider) {
      text(this.thresholdSlider.value(), 350, 50);
    }
    this.drawModeSelection();
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

  computeVisibleTrim(img) {
    img.loadPixels();
    let left = img.width;
    let right = 0;

    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < img.height; y++) {
        let index = (x + y * img.width) * 4;
        let alpha = img.pixels[index + 3];
        if (alpha > 0) {
          left = min(left, x);
          right = max(right, x);
        }
      }
    }

    if (right < left) {
      return { left: 0, right: 0 };
    }

    return { left, right: img.width - 1 - right };
  }
}
