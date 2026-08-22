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
        this.edgeApplied = false;
        this.edgeMatrixX =
            [
                [-1, -2, -1],
                [0, 0, 0],
                [1, 2, 1]
            ];
        this.edgeMatrixY =
            [
                [-1, 0, 1],
                [-2, 0, 2],
                [-1, 0, 1]
            ];
        
        this.centroidApplied = false;
        this.avgX = 0;
        this.avgY = 0;
        
        this.thresholdApplied = false;
        this.thresholdSlider = createSlider(0, 255, 110, 1);
        this.thresholdSlider.position(150, 25);
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

            if (this.edgeApplied) {
                currentImage1 = this.applyEdgeDetection(currentImage1);
                currentImage2 = this.applyEdgeDetection(currentImage2);
            }

            if (this.centroidApplied) {
                let centroidImg1 = this.computeCentroid(currentImage1);
                let centroidImg2 = this.computeCentroid(currentImage2);
                text(`cX: ${centroidImg1[0]}`, currentImage1.width / 2, currentImage1.height + 20);
                text(`cY: ${centroidImg1[1]}`, currentImage1.width / 2, currentImage1.height + 40);
                text(`cX: ${centroidImg2[0]}`, (width / 2) + (currentImage2.width / 2), currentImage2.height + 20);
                text(`cY: ${centroidImg2[1]}`, (width / 2) + (currentImage2.width / 2), currentImage2.height + 40);
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

        fill(255);
        text("Task 2", 50, 50);
        text(this.thresholdSlider.value(), 350, 50);
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
                // let gray = r * 0.299 + g * 0.587 + b * 0.114; // LUMA ratios 

                imgOut.pixels[index + 0] = imgOut.pixels[index + 1] = imgOut.pixels[index + 2] = gray;
                imgOut.pixels[index + 3] = 255;
            }
        }
        imgOut.updatePixels();
        return imgOut;
    }

    applyEdgeDetection(img) {
        let imgOut = createImage(img.width, img.height);
        let matrixSize = this.edgeMatrixX.length;

        imgOut.loadPixels();
        img.loadPixels();

        // read every pixel
        for (let x = 0; x < imgOut.width; x++) {
            for (let y = 0; y < imgOut.height; y++) {

                let index = (x + y * imgOut.width) * 4;
                let cX = this.convolution(x, y, this.edgeMatrixX, matrixSize, img);
                let cY = this.convolution(x, y, this.edgeMatrixY, matrixSize, img);

                cX = map(abs(cX[0]), 0, 1020, 0, 255);
                cY = map(abs(cY[0]), 0, 1020, 0, 255);
                let combo = cX + cY;

                if (this.thresholdApplied) {
                    if (combo > this.thresholdSlider.value()) {
                        imgOut.pixels[index + 0] = combo;
                        imgOut.pixels[index + 1] = combo;
                        imgOut.pixels[index + 2] = combo;
                        imgOut.pixels[index + 3] = 255;
                    } else {
                        imgOut.pixels[index + 0] = 0;
                        imgOut.pixels[index + 1] = 0;
                        imgOut.pixels[index + 2] = 0;
                        imgOut.pixels[index + 3] = 255;
                    }
                } else {
                    imgOut.pixels[index + 0] = combo;
                    imgOut.pixels[index + 1] = combo;
                    imgOut.pixels[index + 2] = combo;
                    imgOut.pixels[index + 3] = 255;
                }
            }
        }
        imgOut.updatePixels();
        return imgOut;
    }

    convolution(x, y, matrix, matrixSize, img) {
        let totalRed = 0.0;
        let totalGreen = 0.0;
        let totalBlue = 0.0;
        let offset = floor(matrixSize / 2);

        // convolution matrix loop
        for (let i = 0; i < matrixSize; i++) {
            for (let j = 0; j < matrixSize; j++) {
                // Get pixel loc within convolution matrix
                let xloc = x + i - offset;
                let yloc = y + j - offset;
                let index = (xloc + img.width * yloc) * 4;
                // ensure we don't address a pixel that doesn't exist
                index = constrain(index, 0, img.pixels.length - 1);

                // multiply all values with the mask and sum up
                totalRed += img.pixels[index + 0] * matrix[i][j];
                totalGreen += img.pixels[index + 1] * matrix[i][j];
                totalBlue += img.pixels[index + 2] * matrix[i][j];
            }
        }
        // return the new color as an array
        return [totalRed, totalGreen, totalBlue];
    }

    computeCentroid(img) {
        // take pixels coordinates
        // calculate total x & y
        // divide to get avg
        // calculate dx & dy by comparing two frames
        img.loadPixels();

        let totalX = 0;
        let totalY = 0;
        let avgX = 0;
        let avgY = 0;

        // read every pixel
        for (let x = 0; x < img.width; x++) {
            for (let y = 0; y < img.height; y++) {

                let index = (x + y * img.width) * 4;

                if (img.pixels[index] < 200) {
                    totalX += x;
                    totalY += y;
                }
            }
        }

        avgX = totalX / (img.width - 1);
        avgY = totalY / (img.height - 1);

        return [avgX, avgY];
    }
}
