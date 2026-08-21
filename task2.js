class Task2 {
    constructor() {
        this.bgColour = 240;
        this.currentImageIndex = 0;
        this.imageLoaded = false;
        this.processed_image = [];

        this.targetTime = 0;
        this.waitDuration = 2000;
        this.timerStarted = false;
        this.animationStarted = false;
    }

    loadImages() {
        this.processed_image = [];
        for (let i = 0; i < task2_images.length; i++) {
            this.processed_image.push(task2_images[i]);
        }
        this.imageLoaded = true;
      }

    draw() {
        background(this.bgColour);
        fill(0);
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
        text("Task 2", 50, 50);
        this.drawModeSelection();
    }

    drawModeSelection() {
        let panelX = width - 235;
        let panelY = 10;
        let panelW = 215;
        let panelH = 200;

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
        text("p: load the panorama", panelX + 14, panelY + 40);
        text("i: load image pairs", panelX + 14, panelY + 60);
        text("g: apply grayscale", panelX + 14, panelY + 80);
        text("e: apply edge filter", panelX + 14, panelY + 100);
        text("t: apply thresholding", panelX + 14, panelY + 120);
        text("n: compute centroid", panelX + 14, panelY + 140);
        text("s: start animation", panelX + 14, panelY + 160);
        text("p: pause animation", panelX + 14, panelY + 180);

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

    loadPanorama() {
        this.bgColour = "#b8e0da";
    }

    
}
