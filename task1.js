/**
 * REASON WHY I USED RGB THRESHOLDING ACROSS ALL IMAGES
 * I tested both RGB and HSB thresholding on all 8 images. RGB thresholding
 * outperformed HSB in every case. For low-saturation content (which are most
 * images, given white/neutral backgrounds and dark or white clothing), HSB's
 * hue channel is unstable near zero saturation, causing incomplete background
 * removal or foreground erosion. Even for image 6, which has a strongly 
 * saturated blue shirt, HSB left more residual background than RGB. This is
 * likely due to hue noise from subtle background brightness variation.
 * Image 8 showed a different failure scenario: HSB removed foreground skin
 * pixels because skin tone and the subject's tan blazer are hue-similar,
 * despite both having moderate saturation. Across the images, RGB's direct
 * comparison of brightness and colour together proved more robust than hue-
 * based discrimination.
 * 
 * IMAGE 2
 * Image 2 has the most leftover background pixels due to the model's frizzy hair.
 * I tried feathering (smooths the transition between foreground and background) 
 * and I found a direct trade-off between smoothing hair edges and preserving the
 * white shirt. This occurs because colour-distance thresholding cannout distinguish
 * two regions of near-identical colour regardless of feathering. Even if it can 
 * smooth the edges, it ended up sacrificing large chunks of the white shirt.
 * I chose to preserve the shirt, accepting the edge on the hair as a result.
 * 
 */


class Task1 {
  constructor() {
    this.bg = bgImg;
    this.currentImageIndex = 0;
    this.bgLoaded = false;
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
    this.bgPanProgress = 0;
    this.bgScrollX = 0;
    this.bgScrollLastTime = 0;
    this.bgScrollSpeed = 80;
    this.movingTextStartTime = 0;
    this.movingTextSpeed = 140;
    
    this.thresholdSlider = createSlider(0, 255, 110, 1);
    this.thresholdSlider.position(520, 15);
  }

  loadCarousel() {
    this.bgColour = color(0, 50, 100);
    this.bg = bgImg;
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
    this.bgScrollX = 0;
    this.bgScrollLastTime = this.holdStartTime;
    this.movingTextStartTime = this.holdStartTime;
  }

  startTransition() {
    this.transitioning = true;
    this.transitionStart = millis();
    this.transitionFrom = this.currentImageIndex;
    this.transitionTo = (this.currentImageIndex + 1) % this.processed_image.length;
    this.panProgress = 0;
  }

  draw() {
    this.thresholdSlider.show();
    if (task2 && task2.thresholdSlider) {
      task2.thresholdSlider.hide();
    }

    if (this.bgLoaded) this.drawBackground();
    fill("#34ebe1");
    imageMode(CORNER);

    if (this.imageLoaded && this.processed_image.length > 0) {
      console.log(`Image index ${this.currentImageIndex}`);
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

  getImageScale(index) {
    return index === 4 ? 0.8 : 1.0;
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
    let fromScale = this.getImageScale(this.transitionFrom);
    let toScale = this.getImageScale(this.transitionTo);

    // fromImg will end animation on the right side
    let fromBounds = this.getFittedBounds(fromImg, fromEndZoom * fromScale, 1.0, false, fromTrim);

    // toImg always starts on the left side, explicitly anchoring visible content
    let toBounds = this.getFittedBounds(toImg, 1.0 * toScale, 0.0, true, toTrim);

    push();
    tint(255, alphaCurrent);
    image(fromImg, fromBounds.x, fromBounds.y, fromBounds.w, fromBounds.h);

    tint(255, alphaNext);
    image(toImg, toBounds.x, toBounds.y, toBounds.w, toBounds.h);
    pop();

    this.drawMovingText();

    if (elapsed >= this.fadeDuration) {
      this.transitioning = false;
      this.currentImageIndex = this.transitionTo;
      this.holdStartTime = millis();
      this.panProgress = 0;
      this.bgPanProgress = 0;
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
    let indexScale = this.getImageScale(this.currentImageIndex);
    // Smoothly interpolate current zoom level
    let zoomFactor = lerp(startZoom, endZoom, progress) * indexScale;
    this.bgPanProgress = progress;

    // Moves continuously from left to right while scaling
    let bounds = this.getFittedBounds(currentImage, zoomFactor, progress, progress <= 0.001, currentTrim);
    image(currentImage, bounds.x, bounds.y, bounds.w, bounds.h);

    this.drawMovingText(progress);
  }

  updateAnimationTimer() {
    if (this.animationStarted && !this.transitioning) {
      if (millis() >= this.targetTime) {
        this.startTransition();
      }
    }
  }

  drawRestingImage() {
    let currentImage = this.processed_image[this.currentImageIndex];
    let currentTrim = this.imageTrims[this.currentImageIndex] || { left: 0, right: 0 };
    let indexScale = this.getImageScale(this.currentImageIndex);
    let bounds = this.getFittedBounds(currentImage, 1.0 * indexScale, 0.0, true, currentTrim);
    image(currentImage, bounds.x, bounds.y, bounds.w, bounds.h);
  }

  drawMovingText() {
    let movingText = "Cat Butler Audition 2026: Cats Save The World";

    push();
    textAlign(LEFT, CENTER);
    textSize(32);
    textStyle(BOLD);
    fill("#c8973d");

    let textWidthValue = textWidth(movingText);
    let cycleWidth = width + textWidthValue;
    let elapsed = millis() - this.movingTextStartTime;
    let offset = (elapsed * this.movingTextSpeed / 1000) % cycleWidth;
    let x = width - offset;

    text(movingText, x, height - 55);
    text(movingText, x + cycleWidth, height - 55);
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

    if (this.thresholdSlider && thresholds[this.currentImageIndex]) {
      let thresholdValue = thresholds[this.currentImageIndex][4];
      this.thresholdSlider.value(thresholdValue);
      fill(235);
      textSize(14);
      text(`THRESHOLD  ${thresholdValue}`, 400, 27);
    }

    pop();
    this.drawModeSelection();
  }

  drawModeSelection() {
    let panelX = width - 248;
    let panelY = 92;
    let panelW = 230;
    let panelH = 174;

    push();
    rectMode(CORNER);
    textAlign(LEFT, CENTER);

    fill(12, 24, 38, 232);
    stroke(255, 220);
    strokeWeight(1.2);
    rect(panelX, panelY, panelW, panelH, 10);

    noStroke();
    fill(255, 235, 180);
    textSize(16);
    textStyle(BOLD);
    text("KEY COMMANDS", panelX + 16, panelY + 22);
    textSize(14);
    textStyle(NORMAL);
    fill(225);
    text("C   load carousel", panelX + 16, panelY + 52);
    text("L   load images", panelX + 16, panelY + 77);
    text("S   start animation", panelX + 16, panelY + 102);
    text("P   pause animation", panelX + 16, panelY + 127);

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
