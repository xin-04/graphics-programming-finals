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

        this.grayscaleApplied = false;
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
            let currentImage1 = this.processed_image[this.currentImageIndex];
            let currentImage2 = this.processed_image[this.currentImageIndex + 1];
            console.log(`Current showing pair ${this.currentImageIndex}`);

            // let scale = 1;
            // let w = currentImage.width * scale;
            // let h = currentImage.height * scale;

            if (this.grayscaleApplied) {
                currentImage1 = this.applyGrayscale(currentImage1);
                currentImage2 = this.applyGrayscale(currentImage2);
            }

            image(currentImage1, 0, 0);
            image(currentImage2, width / 2, 0);
        }

        if (this.animationStarted) {
            if (millis() >= this.targetTime) {
                this.currentImageIndex = (this.currentImageIndex + 2) % task2_images.length;
                this.targetTime = millis() + this.waitDuration;
            }
          }
        text("Task 2", 50, 50);
        this.drawModeSelection();
    }

    drawModeSelection() {
        let panelW = 215;
        let panelH = 200;
        let panelX = width - panelW - 20;
        let panelY = height - panelH - 20;

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

    applyGrayscale(img) {
        let imgOut = createImage(img.width, img.height);
        imgOut.loadPixels();
        img.loadPixels();

        for (let x = 0; x < imgOut.width; x++) {
            for (let y = 0; y < imgOut.height; y++) {

                let index = (x + y * imgOut.width) * 4;

                let r = img.pixels[index + 0];
                let g = img.pixels[index + 1];
                let b = img.pixels[index + 2];

                let gray = (r + g + b) / 3; // simple
                // var gray = r * 0.299 + g * 0.587 + b * 0.114; // LUMA ratios 

                imgOut.pixels[index + 0] = imgOut.pixels[index + 1] = imgOut.pixels[index + 2] = gray;
                imgOut.pixels[index + 3] = 255;
            }
        }
        imgOut.updatePixels();
        return imgOut;
    }    
}
