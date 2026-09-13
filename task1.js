class Task1 {
  constructor() {
    this.bg = bgImg;
    this.currentImageIndex = 0;
    this.bgLoaded = false;
    this.imageLoaded = false;
    this.processedImages = [];
    this.imageTrims = [];

    this.targetTime = 0;
    this.waitDuration = 5000;
    this.fadeDuration = 500;
    this.animationStarted = false;
    this.transitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = 0;
    this.transitionTo = 0;
    this.holdStartTime = 0;
    this.panProgress = 0;
    this.bgScrollX = 0;
    this.bgScrollLastTime = 0;
    this.bgScrollSpeed = 80;
    this.movingTextStartTime = 0;
    this.movingTextSpeed = 140;
    
  }

  loadCarousel() {
    this.bg = bgImg;
  }

  loadImages() {
    this.processedImages = [];
    this.imageTrims = [];
    for (let imageIndex = 0; imageIndex < task1Images.length; imageIndex++) {
      let cleanedImage = this.applyThreshold(task1Images[imageIndex], thresholds[imageIndex]);
      this.processedImages.push(cleanedImage);
      this.imageTrims.push(this.computeVisibleTrim(cleanedImage));
    }
    this.imageLoaded = true;
  }

  startAnimation() {
    this.transitioning = false;
    this.animationStarted = true;

    this.holdStartTime = millis();
    this.targetTime = this.holdStartTime + this.waitDuration;
    this.panProgress = 0;
    this.bgScrollX = 0;
    this.bgScrollLastTime = this.holdStartTime;
    this.movingTextStartTime = this.holdStartTime;
  }

  startTransition() {
    this.transitioning = true;
    this.transitionStart = millis();
    this.transitionFrom = this.currentImageIndex;
    this.transitionTo = (this.currentImageIndex + 1) % this.processedImages.length;
    this.panProgress = 0;
  }

  resetAnimation() {
    this.currentImageIndex = 0;
    this.targetTime = 0;
    this.animationStarted = false;
    this.transitioning = false;
    this.transitionStart = 0;
    this.transitionFrom = 0;
    this.transitionTo = 0;
    this.holdStartTime = 0;
    this.panProgress = 0;
    this.bgScrollX = 0;
    this.bgScrollLastTime = 0;
    this.movingTextStartTime = 0;
  }

  draw() {
    if (task2 && task2.thresholdSlider) {
      task2.thresholdSlider.hide();
    }

    if (this.bgLoaded) {
      this.drawBackground();
    } else {
      background(125);
    }
    fill("#34ebe1");
    imageMode(CORNER);

    if (this.imageLoaded && this.processedImages.length > 0) {
      // FADE IN & OUT LOGIC
      if (this.animationStarted && this.transitioning) {
        this.animateFade();
      } else if (this.animationStarted) {
        // ZOOM IN & OUT LOGIC when animation has been started
        this.animateZoom();
      } else {
        // Show first image at rest until animation starts
        this.drawRestingImage();
      }
    }

    this.updateAnimationTimer();
    this.drawOverlayUI();
  }  

  // panProgress (0.0 = left edge, 1.0 = right edge)
  getFittedBounds(img, zoomFactor = 1.0, panProgress = 0.0, forceLeft = false, trim = { left: 0, right: 0 }) {
    let topOverlayHeight = 76;
    let bottomOverlayHeight = 38;
    let usableHeight = max(1, height - topOverlayHeight - bottomOverlayHeight);
    let baseScale = min(width / img.width, usableHeight / img.height);
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

    let y = topOverlayHeight + (usableHeight - h) / 2;
    return { x, y, w, h };
  }

  getImageScale(index) {
    return index === 4 ? 0.8 : 1.0;
  }

  animateFade() {
    imageMode(CORNER);
    let elapsed = constrain(millis() - this.transitionStart, 0, this.fadeDuration);
    let alphaNext = map(elapsed, 0, this.fadeDuration, 0, 255);
    let alphaCurrent = 255 - alphaNext;

    let fromImage = this.processedImages[this.transitionFrom];
    let toImage = this.processedImages[this.transitionTo];

    // The outgoing image keeps its final zoom level.
    let wasFromEven = (this.transitionFrom % 2 === 0);
    let fromEndZoom = wasFromEven ? 1.4 : 0.7;

    let fromTrim = this.imageTrims[this.transitionFrom] || { left: 0, right: 0 };
    let toTrim = this.imageTrims[this.transitionTo] || { left: 0, right: 0 };
    let fromScale = this.getImageScale(this.transitionFrom);
    let toScale = this.getImageScale(this.transitionTo);

    // The outgoing image ends on the right side.
    let fromBounds = this.getFittedBounds(fromImage, fromEndZoom * fromScale, 1.0, false, fromTrim);

    // The incoming image starts on the left side, explicitly anchoring visible content.
    let toBounds = this.getFittedBounds(toImage, 1.0 * toScale, 0.0, true, toTrim);

    push();
    tint(255, alphaCurrent);
    image(fromImage, fromBounds.x, fromBounds.y, fromBounds.w, fromBounds.h);

    tint(255, alphaNext);
    image(toImage, toBounds.x, toBounds.y, toBounds.w, toBounds.h);
    pop();

    this.drawMovingText(fromEndZoom * fromScale, alphaCurrent);
    this.drawMovingText(toScale, alphaNext);

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
    let currentImage = this.processedImages[this.currentImageIndex];
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
    let indexScale = this.getImageScale(this.currentImageIndex);
    // Smoothly interpolate current zoom level
    let zoomFactor = lerp(startZoom, endZoom, progress) * indexScale;

    // Moves continuously from left to right while scaling
    let bounds = this.getFittedBounds(currentImage, zoomFactor, progress, progress <= 0.001, currentTrim);
    image(currentImage, bounds.x, bounds.y, bounds.w, bounds.h);

    this.drawMovingText(zoomFactor);
  }

  updateAnimationTimer() {
    if (this.animationStarted && !this.transitioning) {
      if (millis() >= this.targetTime) {
        this.startTransition();
      }
    }
  }

  drawRestingImage() {
    let currentImage = this.processedImages[this.currentImageIndex];
    let currentTrim = this.imageTrims[this.currentImageIndex] || { left: 0, right: 0 };
    let indexScale = this.getImageScale(this.currentImageIndex);
    let bounds = this.getFittedBounds(currentImage, 1.0 * indexScale, 0.0, true, currentTrim);
    image(currentImage, bounds.x, bounds.y, bounds.w, bounds.h);
  }

  drawMovingText(zoomFactor = 2.0, alpha = 255) {
    let movingText = "Cat Butler Audition 2026: Who Shall Serve?";
    let baseTextSize = 32;

    push();
    textAlign(LEFT, CENTER);
    textSize(baseTextSize);
    textStyle(BOLD);
    fill(255, 220, 150, alpha);

    let textWidthValue = textWidth(movingText);
    let cycleWidth = width + textWidthValue;
    let elapsed = millis() - this.movingTextStartTime;
    let offset = (elapsed * this.movingTextSpeed / 1000) % cycleWidth;
    let x = width - offset;

    let textY = height - 55;
    textSize(baseTextSize * zoomFactor);
    text(movingText, x, textY);
    text(movingText, x + cycleWidth * zoomFactor, textY);
    pop();
  }

  drawBackground() {
    background(125);
    if (!this.bg) {
      return;
    }

    let w = this.bg.width;
    let h = this.bg.height;
    let y = (height - h) / 2;
    let now = millis();

    if (this.animationStarted) {
      if (!this.bgScrollLastTime) {
        this.bgScrollLastTime = now;
      }

      this.bgScrollX = (this.bgScrollX +
        (now - this.bgScrollLastTime) * this.bgScrollSpeed / 1000) % w;
      this.bgScrollLastTime = now;
    }

    for (let x = this.bgScrollX - w; x < width; x += w) {
      image(this.bg, x, y, w, h);
    }
  }

  drawOverlayUI() {
    push();
    noStroke();
    fill(12, 24, 38, 220);
    rect(0, 0, width, 76);

    textAlign(LEFT, CENTER);
    fill(255, 220, 150);
    textSize(27);
    textStyle(BOLD);
    text("STREAMING CAROUSEL", 32, 27);

    fill(190, 210, 220);
    textSize(12);
    textStyle(NORMAL);
    text("TASK 1  /  BACKGROUND REMOVAL", 34, 52);

    if (this.imageLoaded) {
      let colourSpaceInt = thresholds[this.currentImageIndex][0];
      let colourSpaceStr;
      if (colourSpaceInt > 0) colourSpaceStr = "HSB";
      else colourSpaceStr = "RGB";

      let c1 = thresholds[this.currentImageIndex][1];
      let c2 = thresholds[this.currentImageIndex][2];
      let c3 = thresholds[this.currentImageIndex][3];
      let thresholdValue = thresholds[this.currentImageIndex][4];
      fill(235);
      textSize(14);
      text(`COLOUR SPACE: ${colourSpaceStr}`, 400, 27);
      text(`C1: ${c1}`, 600, 27);
      text(`C2: ${c2}`, 700, 27);
      text(`C3: ${c3}`, 800, 27);
      text(`THRESHOLD: ${thresholdValue}`, 900, 27);

      fill(155, 180, 190);
      text(`CURRENT IMAGE SHOWN: ${this.currentImageIndex + 1}`, 400, 51);
    }
    
    pop();
    this.drawModeSelection();
  }

  drawModeSelection() {
    let panelX = 0;
    let panelY = height - 38;
    let panelW = width;
    let panelH = 38;

    push();
    rectMode(CORNER);
    textAlign(LEFT, CENTER);

    fill(12, 24, 38, 232);
    stroke(255, 180);
    strokeWeight(1.2);
    rect(panelX, panelY, panelW, panelH);

    noStroke();
    fill(255, 235, 180);
    textSize(14);
    textStyle(BOLD);
    text("KEY COMMANDS", panelX + 22, panelY + panelH / 2);

    textSize(13);
    textStyle(NORMAL);
    fill(225);
    text("C   load carousel", panelX + 250, panelY + panelH / 2);
    text("L   load images", panelX + 450, panelY + panelH / 2);
    text("S   start animation", panelX + 650, panelY + panelH / 2);
    text("P   pause animation", panelX + 850, panelY + panelH / 2);

    pop();
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
  }

  pauseAnimation() {
    this.targetTime = 0;
    this.animationStarted = false;
  }

  applyThreshold(img, thresholds) {
    let colourSpace = thresholds[0];
    let targetA = thresholds[1];
    let targetB = thresholds[2];
    let targetC = thresholds[3];
    let thresholdVal = thresholds[4];

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
        } else {
          imgOut.pixels[index + 3] = originalA;
        }
      }
    }

    imgOut.updatePixels();
    return imgOut;
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
