/**
Pair 1: dx=80, dy=0
Pair 2: dx=-90, dy=0
Pair 3: dx=74.8368004130028, dy=77.75557299909443
Pair 4: dx=-75.00000000000003, dy=-75
Pair 5: dx=0, dy=-96.99999999999997
Pair 6: dx=0, dy=112
Pair 7: dx=-141, dy=66
Pair 8: dx=121, dy=-85
*/

// EXTENSION
// METHODS: divideIntoBlock, aggregateBlockMotion, drawBlockMotionVectors, applyBlockMotionEstimation
// ISSUE: pair 5-8 are not estimated correctly (inconsistent arrows)
// FOUND: pair 5-8 has bigger leap in centroid values
// FIX: even bigger searchRange

// TODO: optimise computeCentroid, right now it doesn't trigger the first time when i press the button

class Task2 {
    constructor() {
        this.bgColour = 240;
        this.currentImageIndex = 0;
        this.imageLoaded = false;
        this.processed_image = [];

        this.targetTime = 0;
        this.waitDuration = 2000;
        this.animationStarted = false;
        this.directionShowed = false;

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
        this.cachedDirection = "UNDEFINED";

        // EXTENSION
        this.blockSize = 16;

        // Drawback: huge performance cost
        // Candidate count per block: (2 x searchRange + 1) ^ 2
        this.searchRange = 160;

        this.minimumBlockContentRatio = 0.05;
        this.blockMotionVectors = [];
        this.blockMotionDirection = "UNDEFINED";
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

        if (this.thresholdApplied) {
            this.blockMotionVectors = this.applyBlockMotionEstimation(source1, source2);
            this.blockMotionDirection = this.aggregateBlockMotion(this.blockMotionVectors);
        } else {
            this.blockMotionVectors = [];
            this.blockMotionDirection = "UNDEFINED";
        }

        if (this.centroidApplied) {
            let centroid1 = this.computeCentroid(source1);
            let centroid2 = this.computeCentroid(source2);
            console.log(`Pair ${(this.currentImageIndex / 2) + 1}: dx=${centroid2[0] - centroid1[0]}, dy=${centroid2[1] - centroid1[1]}`);
            this.cachedCentroid1 = centroid1;
            this.cachedCentroid2 = centroid2;
            this.cachedDirection = this.decideMotion(this.cachedCentroid1, this.cachedCentroid2);
        } else {
            this.cachedCentroid1 = [0, 0];
            this.cachedCentroid2 = [0, 0];
            this.cachedDirection = "UNDEFINED";
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

            if (this.directionShowed) {
                let direction = this.cachedDirection;
                let directionX = currentImage1.width / 2;
                let directionY = currentImage1.height + 60;
                text(`Direction: ${direction}`, directionX, directionY);
                if (direction && direction !== "UNDEFINED") {
                    this.drawDirectionArrow(direction, directionX, directionY + 20);
                }

                // EXTENSION
                this.drawBlockMotionVectors(width / 2);
            }

            
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
        let panelH = 220;
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
        text("d: display arrows", panelX + 14, panelY + 160);
        text("s: start animation", panelX + 14, panelY + 180);
        text("p: pause animation", panelX + 14, panelY + 200);

        pop();
        textAlign(CENTER, CENTER);
        textStyle(NORMAL);
    }

    startAnimation() {
        this.targetTime = millis() + this.waitDuration;
        this.animationStarted = true;
    }

    pauseAnimation() {
        this.targetTime = 0;
        this.animationStarted = false;
    }

    loadPanorama() {
        this.bgColour = "#b8e0da";
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

    aggregateBlockMotion(vectors) {
        let weightedDX = 0;
        let weightedDY = 0;
        let totalWeight = 0;

        for (let vector of vectors) {
            weightedDX += vector.dx * vector.pixelCount;
            weightedDY += vector.dy * vector.pixelCount;
            totalWeight += vector.pixelCount;
        }

        if (totalWeight === 0) {
            return "UNDEFINED";
        }

        let averageDX = weightedDX / totalWeight;
        let averageDY = weightedDY / totalWeight;
        return this.decideMotion([0, 0], [averageDX, averageDY]);
    }

    drawBlockMotionVectors(imageOffsetX = 0) {
        for (let vector of this.blockMotionVectors) {
            let direction = this.decideMotion([0, 0], [vector.dx, vector.dy]);
            if (direction !== "UNDEFINED") {
                this.drawDirectionArrow(
                    direction,
                    imageOffsetX + vector.x + vector.dx,
                    vector.y + vector.dy,
                    16
                );
            }
        }
    }

    // sad = Sum of Absolute Difference
    applyBlockMotionEstimation(referenceFrame, targetFrame, blockSize = this.blockSize, searchRange = this.searchRange) {
        if (!referenceFrame || !targetFrame ||
            referenceFrame.width !== targetFrame.width ||
            referenceFrame.height !== targetFrame.height) {
            return [];
        }

        if (blockSize <= 0 || searchRange < 0) {
            return [];
        }

        referenceFrame.loadPixels();
        targetFrame.loadPixels();

        let vectors = [];

        // bx = blockX; by = blockY
        for (let by = 0; by < referenceFrame.height; by += blockSize) {
            for (let bx = 0; bx < referenceFrame.width; bx += blockSize) {
                let blockWidth = min(blockSize, referenceFrame.width - bx);
                let blockHeight = min(blockSize, referenceFrame.height - by);
                let blockArea = blockWidth * blockHeight;
                let pixelCount = 0;

                for (let y = 0; y < blockHeight; y++) {
                    for (let x = 0; x < blockWidth; x++) {
                        let referenceIndex = ((by + y) * referenceFrame.width + bx + x) * 4;
                        if (referenceFrame.pixels[referenceIndex] > 0) {
                            pixelCount++;
                        }
                    }
                }

                let minimumPixelCount = Math.ceil(blockArea * this.minimumBlockContentRatio);
                if (pixelCount < minimumPixelCount || pixelCount === blockArea) {
                    continue;
                }

                let bestSAD = Infinity;
                let bestOffset = { dx: 0, dy: 0 };

                for (let oy = -searchRange; oy <= searchRange; oy++) {
                    for (let ox = -searchRange; ox <= searchRange; ox++) {
                        let candidateX = bx + ox;
                        let candidateY = by + oy;

                        if (candidateX < 0 || candidateY < 0 ||
                            candidateX + blockWidth > targetFrame.width ||
                            candidateY + blockHeight > targetFrame.height) {
                            continue;
                        }

                        let sad = 0;
                        candidatePixels:
                        for (let y = 0; y < blockHeight; y++) {
                            for (let x = 0; x < blockWidth; x++) {
                                let referenceIndex = ((by + y) * referenceFrame.width + bx + x) * 4;
                                let targetIndex = ((candidateY + y) * targetFrame.width + candidateX + x) * 4;
                                sad += abs(referenceFrame.pixels[referenceIndex] - targetFrame.pixels[targetIndex]);

                                if (sad >= bestSAD) {
                                    break candidatePixels;
                                }
                            }
                        }

                        if (sad < bestSAD) {
                            bestSAD = sad;
                            bestOffset = { dx: ox, dy: oy };
                        }
                    }
                }

                console.log(`block(${bx},${by}) dx=${bestOffset.dx} dy=${bestOffset.dy} sad=${bestSAD}`);
                
                vectors.push({
                    x: bx,
                    y: by,
                    dx: bestOffset.dx,
                    dy: bestOffset.dy,
                    sad: bestSAD,
                    pixelCount: pixelCount
                });
            }
        }

        this.blockMotionVectors = vectors;
        return vectors;
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

    decideMotion(centroidImage1, centroidImage2) {
        let diffX = centroidImage2[0] - centroidImage1[0];
        let diffY = centroidImage2[1] - centroidImage1[1];

        if (diffX < 0 && diffY === 0) {
            return "LEFT";
        } else if (diffX > 0 && diffY === 0) {
            return "RIGHT";
        } else if (diffX === 0 && diffY < 0) {
            return "UP";
        } else if (diffX === 0 && diffY > 0) {
            return "DOWN";
        } else if (diffX < 0 && diffY < 0) {
            return "UP-LEFT";
        } else if (diffX < 0 && diffY > 0) {
            return "DOWN-LEFT";
        } else if (diffX > 0 && diffY < 0) {
            return "UP-RIGHT";
        } else if (diffX > 0 && diffY > 0) {
            return "DOWN-RIGHT";
        }
        return "UNDEFINED";
    }

    drawDirectionArrow(direction, x, y, length = 30) {
        push();
        stroke(255);
        strokeWeight(3);
        fill(255);
        translate(x, y);
        let len = length;
        let head = length * 0.27;

        let dx = 0;
        let dy = 0;
        switch (direction) {
            case "LEFT":
                dx = -1;
                break;
            case "RIGHT":
                dx = 1;
                break;
            case "UP":
                dy = -1;
                break;
            case "DOWN":
                dy = 1;
                break;
            case "UP-LEFT":
                dx = -0.7;
                dy = -0.7;
                break;
            case "UP-RIGHT":
                dx = 0.7;
                dy = -0.7;
                break;
            case "DOWN-LEFT":
                dx = -0.7;
                dy = 0.7;
                break;
            case "DOWN-RIGHT":
                dx = 0.7;
                dy = 0.7;
                break;
        }

        let endX = dx * len;
        let endY = dy * len;
        line(0, 0, endX, endY);

        let angle = atan2(dy, dx);
        if (dx !== 0 || dy !== 0) {
            let arrowX = endX;
            let arrowY = endY;
            push();
            translate(arrowX, arrowY);
            rotate(angle);
            triangle(0, 0, -head, head / 2, -head, -head / 2);
            pop();
        }

        pop();
    }
}
