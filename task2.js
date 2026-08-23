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
        this.thresholdSlider.input(() => this.onThresholdSliderMoved());

        this.cachedImageIndex = -1;
        this.cachedGrayscaleApplied = false;
        this.cachedEdgeApplied = false;
        this.cachedThresholdApplied = false;
        this.cachedThresholdValue = -1;
        this.cachedRawImage1 = null;
        this.cachedRawImage2 = null;
        this.cachedGrayscaleImage1 = null;
        this.cachedGrayscaleImage2 = null;
        this.cachedEdgeImage1 = null;
        this.cachedEdgeImage2 = null;
        this.cachedThresholdedImage1 = null;
        this.cachedThresholdedImage2 = null;
        this.cachedProcessedImage1 = null;
        this.cachedProcessedImage2 = null;
        this.cachedCentroid1 = [0, 0];
        this.cachedCentroid2 = [0, 0];
    }

    loadImages() {
        this.processed_image = [];
        for (let i = 0; i < task2_images.length; i++) {
            this.processed_image.push(task2_images[i]);
        }
        this.imageLoaded = true;
    }

    onThresholdSliderMoved() {
        if (!this.imageLoaded || !this.thresholdApplied || !this.centroidApplied) {
            return;
        }
        this.updateCachedProcessedImages();
    }

    updateCachedProcessedImages() {
        if (!this.imageLoaded || this.processed_image.length < 2) {
            return;
        }

        let thresholdValue = this.thresholdSlider.value();
        let previousThresholdValue = this.cachedThresholdValue;
        let needsUpdate =
            this.cachedImageIndex !== this.currentImageIndex ||
            this.cachedGrayscaleApplied !== this.grayscaleApplied ||
            this.cachedEdgeApplied !== this.edgeApplied ||
            this.cachedThresholdApplied !== this.thresholdApplied ||
            this.cachedThresholdValue !== thresholdValue;

        if (!needsUpdate) {
            return;
        }

        this.cachedImageIndex = this.currentImageIndex;
        this.cachedGrayscaleApplied = this.grayscaleApplied;
        this.cachedEdgeApplied = this.edgeApplied;
        this.cachedThresholdApplied = this.thresholdApplied;
        this.cachedThresholdValue = thresholdValue;

        if (this.cachedThresholdValue !== previousThresholdValue) {
            this.cachedThresholdedImage1 = null;
            this.cachedThresholdedImage2 = null;
        }

        let raw1 = this.processed_image[this.currentImageIndex];
        let raw2 = this.processed_image[this.currentImageIndex + 1];

        if (this.cachedRawImage1 !== raw1) {
            this.cachedRawImage1 = raw1;
            this.cachedGrayscaleImage1 = null;
            this.cachedEdgeImage1 = null;
            this.cachedThresholdedImage1 = null;
        }
        if (this.cachedRawImage2 !== raw2) {
            this.cachedRawImage2 = raw2;
            this.cachedGrayscaleImage2 = null;
            this.cachedEdgeImage2 = null;
            this.cachedThresholdedImage2 = null;
        }

        let source1 = raw1;
        let source2 = raw2;

        if (this.grayscaleApplied) {
            if (!this.cachedGrayscaleImage1) {
                this.cachedGrayscaleImage1 = this.computeGrayscaleImage(raw1);
            }
            if (!this.cachedGrayscaleImage2) {
                this.cachedGrayscaleImage2 = this.computeGrayscaleImage(raw2);
            }
            source1 = this.cachedGrayscaleImage1;
            source2 = this.cachedGrayscaleImage2;
        }

        if (this.edgeApplied) {
            if (!this.cachedEdgeImage1) {
                this.cachedEdgeImage1 = this.computeEdgeImage(source1);
            }
            if (!this.cachedEdgeImage2) {
                this.cachedEdgeImage2 = this.computeEdgeImage(source2);
            }
            source1 = this.cachedEdgeImage1;
            source2 = this.cachedEdgeImage2;
        }

        if (this.thresholdApplied) {
            if (!this.cachedThresholdedImage1 || this.cachedThresholdValue !== thresholdValue) {
                this.cachedThresholdedImage1 = this.applyThresholdToEdge(source1, thresholdValue);
            }
            if (!this.cachedThresholdedImage2 || this.cachedThresholdValue !== thresholdValue) {
                this.cachedThresholdedImage2 = this.applyThresholdToEdge(source2, thresholdValue);
            }
            source1 = this.cachedThresholdedImage1;
            source2 = this.cachedThresholdedImage2;
        }

        this.cachedProcessedImage1 = source1;
        this.cachedProcessedImage2 = source2;

        if (this.centroidApplied) {
            this.cachedCentroid1 = this.computeCentroid(source1);
            this.cachedCentroid2 = this.computeCentroid(source2);
        } else {
            this.cachedCentroid1 = [0, 0];
            this.cachedCentroid2 = [0, 0];
        }
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

            this.updateCachedProcessedImages();
            currentImage1 = this.cachedProcessedImage1 || currentImage1;
            currentImage2 = this.cachedProcessedImage2 || currentImage2;

            if (this.centroidApplied) {
                let centroidImg1 = this.cachedCentroid1;
                let centroidImg2 = this.cachedCentroid2;
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
        let edgeImg = this.computeEdgeImage(img);
        if (this.thresholdApplied) {
            return this.applyThresholdToEdge(edgeImg, this.thresholdSlider.value());
        }
        return edgeImg;
    }

    computeGrayscaleImage(img) {
        let imgOut = createImage(img.width, img.height);
        imgOut.loadPixels();
        img.loadPixels();

        for (let x = 0; x < imgOut.width; x++) {
            for (let y = 0; y < imgOut.height; y++) {
                let index = (x + y * imgOut.width) * 4;
                let r = img.pixels[index + 0];
                let g = img.pixels[index + 1];
                let b = img.pixels[index + 2];
                let gray = (r + g + b) / 3;

                imgOut.pixels[index + 0] = imgOut.pixels[index + 1] = imgOut.pixels[index + 2] = gray;
                imgOut.pixels[index + 3] = 255;
            }
        }
        imgOut.updatePixels();
        return imgOut;
    }

    computeEdgeImage(img) {
        let imgOut = createImage(img.width, img.height);
        let matrixSize = this.edgeMatrixX.length;

        imgOut.loadPixels();
        img.loadPixels();

        for (let x = 0; x < imgOut.width; x++) {
            for (let y = 0; y < imgOut.height; y++) {
                let index = (x + y * imgOut.width) * 4;
                let cX = this.convolution(x, y, this.edgeMatrixX, matrixSize, img);
                let cY = this.convolution(x, y, this.edgeMatrixY, matrixSize, img);

                cX = map(abs(cX[0]), 0, 1020, 0, 255);
                cY = map(abs(cY[0]), 0, 1020, 0, 255);
                let combo = cX + cY;

                imgOut.pixels[index + 0] = combo;
                imgOut.pixels[index + 1] = combo;
                imgOut.pixels[index + 2] = combo;
                imgOut.pixels[index + 3] = 255;
            }
        }
        imgOut.updatePixels();
        return imgOut;
    }

    applyThresholdToEdge(img, thresholdValue) {
        let imgOut = createImage(img.width, img.height);

        imgOut.loadPixels();
        img.loadPixels();

        let index = 0;
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                let value = img.pixels[index];
                if (value > thresholdValue) {
                    imgOut.pixels[index + 0] = value;
                    imgOut.pixels[index + 1] = value;
                    imgOut.pixels[index + 2] = value;
                } else {
                    imgOut.pixels[index + 0] = 0;
                    imgOut.pixels[index + 1] = 0;
                    imgOut.pixels[index + 2] = 0;
                }
                imgOut.pixels[index + 3] = 255;
                index += 4;
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
        // take pixels coordinates from the thresholded result
        // add together all selected pixel x and y values
        // divide by the number of selected pixels to get avg
        img.loadPixels();

        let totalX = 0;
        let totalY = 0;
        let count = 0;

        for (let x = 0; x < img.width; x++) {
            for (let y = 0; y < img.height; y++) {
                let index = (x + y * img.width) * 4;
                let pixelValue = img.pixels[index];

                if (pixelValue > 0) {
                    totalX += x;
                    totalY += y;
                    count++;
                }
            }
        }

        if (count === 0) {
            return [0, 0];
        }

        return [totalX / count, totalY / count];
    }
}
