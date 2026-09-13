class Task2 {
    constructor() {
        this.bgColour = 240;
        this.currentImageIndex = 0;
        this.imageLoaded = false;
        this.processedImages = [];

        this.directionShowed = false;

        this.grayscaleApplied = false;
        this.edgeApplied = false;
        this.edgeMatrixX = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];
        this.edgeMatrixY = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        
        this.centroidApplied = false;
        
        this.thresholdApplied = false;
        this.thresholdSlider = createSlider(0, 255, 110, 1);
        this.thresholdSlider.position(590, 15);
        this.thresholdSlider.changed(() => this.onThresholdSliderChanged());

        this.cachedImageIndex = -1;
        this.cachedGrayscaleApplied = false;
        this.cachedEdgeApplied = false;
        this.cachedThresholdApplied = false;
        this.cachedCentroidApplied = false;
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
        this.searchRange = 140;

        this.minimumBlockContentRatio = 0.05;
        this.blockMotionVectors = [];
        this.blockMotionDirection = "UNDEFINED";
        this.blockMotionShown = false;
        this.blockMotionProcessingTime = null;
        this.hasShownDirectionArrows = false;
        this.directionArrowsShownAt = 0;
    }

    loadImages() {
        this.processedImages = [];
        for (let imageIndex = 0; imageIndex < task2Images.length; imageIndex++) {
            this.processedImages.push(task2Images[imageIndex]);
        }
        this.imageLoaded = true;
    }

    onThresholdSliderChanged() {
        if (!this.imageLoaded || !this.thresholdApplied || !this.centroidApplied) {
            return;
        }

        // Refresh the processed images before using the new threshold.
        this.updateCachedProcessedImages(false);

        if (this.blockMotionShown) {
            this.runBlockMotionEstimation();
        } else {
            this.resetBlockMotionDisplay();
        }
    }

    resetAnimation() {
        this.resetBlockMotionDisplay();
    }

    runBlockMotionEstimation() {
        this.updateCachedProcessedImages(false);

        if (!this.thresholdApplied || !this.cachedProcessedImage1 || !this.cachedProcessedImage2) {
            return;
        }

        this.blockMotionVectors = this.applyBlockMotionEstimation(
            this.cachedProcessedImage1,
            this.cachedProcessedImage2
        );
        this.blockMotionDirection = this.aggregateBlockMotion(this.blockMotionVectors);
        this.blockMotionShown = true;
    }

    updateCachedProcessedImages(calculateBlockMotion = true, forceUpdate = false) {
        if (!this.imageLoaded || this.processedImages.length < 2) {
            return;
        }

        let thresholdValue = this.thresholdSlider.value();
        let previousThresholdValue = this.cachedThresholdValue;
        let needsUpdate =
            this.cachedImageIndex !== this.currentImageIndex ||
            this.cachedGrayscaleApplied !== this.grayscaleApplied ||
            this.cachedEdgeApplied !== this.edgeApplied ||
            this.cachedThresholdApplied !== this.thresholdApplied ||
            this.cachedCentroidApplied !== this.centroidApplied ||
            this.cachedThresholdValue !== thresholdValue;

        if (!needsUpdate && !forceUpdate) {
            return;
        }

        this.cachedImageIndex = this.currentImageIndex;
        this.cachedGrayscaleApplied = this.grayscaleApplied;
        this.cachedEdgeApplied = this.edgeApplied;
        this.cachedThresholdApplied = this.thresholdApplied;
        this.cachedCentroidApplied = this.centroidApplied;
        this.cachedThresholdValue = thresholdValue;

        if (this.cachedThresholdValue !== previousThresholdValue) {
            this.cachedThresholdedImage1 = null;
            this.cachedThresholdedImage2 = null;
        }

        let referenceImage = this.processedImages[this.currentImageIndex];
        let targetImage = this.processedImages[this.currentImageIndex + 1];

        if (this.cachedRawImage1 !== referenceImage) {
            this.cachedRawImage1 = referenceImage;
            this.cachedGrayscaleImage1 = null;
            this.cachedEdgeImage1 = null;
            this.cachedThresholdedImage1 = null;
        }
        if (this.cachedRawImage2 !== targetImage) {
            this.cachedRawImage2 = targetImage;
            this.cachedGrayscaleImage2 = null;
            this.cachedEdgeImage2 = null;
            this.cachedThresholdedImage2 = null;
        }

        let referenceSource = referenceImage;
        let targetSource = targetImage;

        if (this.grayscaleApplied) {
            if (!this.cachedGrayscaleImage1) {
                this.cachedGrayscaleImage1 = this.computeGrayscaleImage(referenceImage);
            }
            if (!this.cachedGrayscaleImage2) {
                this.cachedGrayscaleImage2 = this.computeGrayscaleImage(targetImage);
            }
            referenceSource = this.cachedGrayscaleImage1;
            targetSource = this.cachedGrayscaleImage2;
        }

        if (this.edgeApplied) {
            if (!this.cachedEdgeImage1) {
                this.cachedEdgeImage1 = this.computeEdgeImage(referenceSource);
            }
            if (!this.cachedEdgeImage2) {
                this.cachedEdgeImage2 = this.computeEdgeImage(targetSource);
            }
            referenceSource = this.cachedEdgeImage1;
            targetSource = this.cachedEdgeImage2;
        }

        if (this.thresholdApplied) {
            if (!this.cachedThresholdedImage1 || this.cachedThresholdValue !== thresholdValue) {
                this.cachedThresholdedImage1 = this.applyThresholdToEdge(referenceSource, thresholdValue);
            }
            if (!this.cachedThresholdedImage2 || this.cachedThresholdValue !== thresholdValue) {
                this.cachedThresholdedImage2 = this.applyThresholdToEdge(targetSource, thresholdValue);
            }
            referenceSource = this.cachedThresholdedImage1;
            targetSource = this.cachedThresholdedImage2;
        }

        this.cachedProcessedImage1 = referenceSource;
        this.cachedProcessedImage2 = targetSource;

        if (!this.thresholdApplied) {
            this.blockMotionVectors = [];
            this.blockMotionDirection = "UNDEFINED";
        }

        if (this.centroidApplied) {
            let centroid1 = this.computeCentroid(referenceSource);
            let centroid2 = this.computeCentroid(targetSource);
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
        this.thresholdSlider.show();
        if (task1 && task1.thresholdSlider) {
            task1.thresholdSlider.hide();
        }

        background(this.bgColour);
        let headerHeight = 72;
        let imageGap = 34;
        let imageY = headerHeight + 28;

        push();
        noStroke();
        fill(18, 30, 42, 235);
        rect(0, 0, width, headerHeight);
        fill(255, 220, 150);
        textAlign(LEFT, CENTER);
        textSize(28);
        textStyle(BOLD);
        text("PANORAMA MOTION GUIDE", 34, 28);
        fill(190, 210, 220);
        textSize(13);
        textStyle(NORMAL);
        text("TASK 2  /  MOTION ESTIMATION", 36, 52);
        fill(225);
        textSize(14);
        text(`THRESHOLD  ${this.thresholdSlider.value()}`, 450, 27);
        fill(155, 180, 190);
        text("Adjust the threshold before estimating motion", 450, 51);
        pop();

        fill(0);
        if (this.imageLoaded && this.processedImages.length > 0) {
            let currentImage1 = this.processedImages[this.currentImageIndex];
            let currentImage2 = this.processedImages[this.currentImageIndex + 1];

            this.updateCachedProcessedImages();
            currentImage1 = this.cachedProcessedImage1 || currentImage1;
            currentImage2 = this.cachedProcessedImage2 || currentImage2;

            let imageX1 = (width - currentImage1.width * 2 - imageGap) / 2;
            let imageX2 = imageX1 + currentImage1.width + imageGap;

            this.drawImagePanel(currentImage1, imageX1, imageY, "REFERENCE FRAME");
            this.drawImagePanel(currentImage2, imageX2, imageY, "TARGET FRAME");

            if (this.centroidApplied) {
                let centroid1 = this.cachedCentroid1;
                let centroid2 = this.cachedCentroid2;
                text(
                    `Pair ${(this.currentImageIndex / 2) + 1}: dx=${centroid2[0] - centroid1[0]}, dy=${centroid2[1] - centroid1[1]}`,
                    width / 2,
                    imageY + currentImage1.height + 28
                );
            }

            image(currentImage1, imageX1, imageY);
            image(currentImage2, imageX2, imageY);

            if (this.directionShowed) {
                let direction = this.cachedDirection;
                let directionX = width / 2;
                let directionY = imageY + currentImage1.height + 57;

                text(`Basic Estimated Direction: ${direction}`, directionX, directionY);
                if (direction && direction !== "UNDEFINED") {
                    this.drawDirectionArrow(direction, directionX, directionY + 40);
                }

                if (this.blockMotionShown) {
                    // EXTENSION
                    this.hasShownDirectionArrows = this.drawBlockMotionVectors(
                        imageX2,
                        imageY,
                        this.hasShownDirectionArrows
                    );
                    text(`Block-based Estimated Direction: ${this.blockMotionDirection}`, directionX, directionY + 80);
                    text(
                        `Block estimation time: ${this.blockMotionProcessingTime} ms`,
                        directionX,
                        directionY + 100
                    );
                }

            }
        }

        push();
        textAlign(CENTER, CENTER);
        textSize(13);
        fill(20, 35, 45, 220);
        rect(190, height - 76, 520, 48, 8);
        fill(255);
        textStyle(BOLD);
        text(`PAIR ${(this.currentImageIndex / 2) + 1} OF ${this.processedImages.length / 2}`, 320, height - 52);
        fill(185, 205, 210);
        textStyle(NORMAL);
        text("Left / Right arrows to navigate", 555, height - 52);
        pop();
        this.drawModeSelection();
    }

    drawImagePanel(imageToDraw, x, y, label) {
        push();
        noStroke();
        fill(18, 30, 42, 190);
        rect(x - 10, y - 30, imageToDraw.width + 20, imageToDraw.height + 42, 8);
        fill(255, 220, 150);
        textAlign(LEFT, CENTER);
        textSize(13);
        textStyle(BOLD);
        text(label, x, y - 14);
        pop();
    }

    drawModeSelection() {
        let panelW = 285;
        let panelH = 250;
        let panelX = 850;
        let panelY = height - panelH - 16;

        push();
        rectMode(CORNER);
        textAlign(LEFT, CENTER);

        fill(18, 30, 42, 245);
        stroke(255, 220);
        strokeWeight(1.2);
        rect(panelX, panelY, panelW, panelH, 10);

        noStroke();
        fill(255, 235, 180);
        textSize(17);
        textStyle(BOLD);
        text("KEY COMMANDS", panelX + 18, panelY + 22);
        textSize(14);
        textStyle(NORMAL);
        fill(220);
        text("P   panorama", panelX + 18, panelY + 48);
        text("I   load image pairs", panelX + 18, panelY + 69);
        text("G   grayscale", panelX + 18, panelY + 90);
        text("E   edge filter", panelX + 18, panelY + 111);
        text("T   thresholding", panelX + 18, panelY + 132);
        text("N   compute centroid", panelX + 18, panelY + 153);
        text("D   display arrows", panelX + 18, panelY + 175);
        text("B   block-based estimate", panelX + 18, panelY + 198);
        text("LEFT / RIGHT   change pair", panelX + 18, panelY + 220);

        pop();
        textAlign(CENTER, CENTER);
        textStyle(NORMAL);
    }

    nextPair() {
        if (!this.imageLoaded || this.processedImages.length < 2) {
            return;
        }

        let pairCount = this.processedImages.length / 2;
        let currentPair = this.currentImageIndex / 2;
        this.currentImageIndex = ((currentPair + 1) % pairCount) * 2;
        this.resetBlockMotionDisplay();
    }

    previousPair() {
        if (!this.imageLoaded || this.processedImages.length < 2) {
            return;
        }

        let pairCount = this.processedImages.length / 2;
        let currentPair = this.currentImageIndex / 2;
        this.currentImageIndex = ((currentPair - 1 + pairCount) % pairCount) * 2;
        this.resetBlockMotionDisplay();
    }

    resetBlockMotionDisplay() {
        this.blockMotionVectors = [];
        this.blockMotionDirection = "UNDEFINED";
        this.blockMotionShown = false;
        this.blockMotionProcessingTime = null;
        this.hasShownDirectionArrows = false;
        this.directionArrowsShownAt = 0;
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

    /**
     * Combines all per-block motion vectors into a single overall direction estimate
     * @param {Array} vectors - block motion vectors from applyBlockMotionEstimation()
     * @returns {string} One of the 8 direction labels
     */
    aggregateBlockMotion(vectors) {
        let weightedDX = 0;
        let weightedDY = 0;
        let totalWeight = 0;

        // Each block vector is weighted by its pixelCount
        // Blocks with stronger content contribute more to the final estimate
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

    drawBlockMotionVectors(
        imageOffsetX = 0,
        imageOffsetY = 0,
        hasShownDirectionArrows = false
    ) {
        if (this.directionArrowsShownAt === 0) {
            this.directionArrowsShownAt = millis();
        }

        for (let vector of this.blockMotionVectors) {
            let direction = this.decideMotion([0, 0], [vector.dx, vector.dy]);
            if (direction !== "UNDEFINED") {
                this.drawDirectionArrow(
                    direction,
                    imageOffsetX + vector.x + vector.dx,
                    imageOffsetY + vector.y + vector.dy,
                    16
                );
            }
        }

        if (!hasShownDirectionArrows &&
            millis() - this.directionArrowsShownAt >= 3000) {
            hasShownDirectionArrows = true;
        }

        return hasShownDirectionArrows;
    }

    /**
     * Block-based motion estimation using Sum of Absolute Differences
     * 
     * Divides the reference frame into a grid of fixed-size blocks
     * Independently estimate how each block moved between two frames
     * Reveals whether motion is uniform across the image or varies spatially 
     * 
     * PERFORMANCE NOTE
     * Candidate count per block is (2*searchRange+1)^2
     * This is the most computationally expensive part of the extension
     * searchRange must be large enough to cover the largest expected displacement
     * between frames, or the matcher cannot find the true position at all.
     * 
     * @param {p5.Image} referenceFrame - frame A diced into blocks
     * @param {p5.Image} targetFrame - frame B searched for matches
     * @param {number} blockSize - width / height of each square block in pixles
     * @param {number} searchRange - max offset (in pixels) searched in each direction
     * @returns {Array<{x, y, dx, dy, sad, pixelCount}>} One entry per block that passed
     *      the content filter, giving its position, estimated motion vector, best
     *      SAD score, and hoe many foreground pixels it contained
     */
    applyBlockMotionEstimation(referenceFrame, targetFrame, blockSize = this.blockSize, searchRange = this.searchRange) {
        if (!referenceFrame || !targetFrame ||
            referenceFrame.width !== targetFrame.width ||
            referenceFrame.height !== targetFrame.height) {
            return [];
        }

        if (blockSize <= 0 || searchRange < 0) {
            return [];
        }

        let startTime = millis();
        referenceFrame.loadPixels();
        targetFrame.loadPixels();

        let vectors = [];

        for (let by = 0; by < referenceFrame.height; by += blockSize) {
            for (let bx = 0; bx < referenceFrame.width; bx += blockSize) {
                let blockWidth = min(blockSize, referenceFrame.width - bx);
                let blockHeight = min(blockSize, referenceFrame.height - by);
                let blockArea = blockWidth * blockHeight;
                let pixelCount = 0;

                // Count non-zero (thresholded) pixels
                for (let y = 0; y < blockHeight; y++) {
                    for (let x = 0; x < blockWidth; x++) {
                        let referenceIndex = ((by + y) * referenceFrame.width + bx + x) * 4;
                        if (referenceFrame.pixels[referenceIndex] > 0) {
                            pixelCount++;
                        }
                    }
                }

                // Blocks with too little content or too much are skipped
                let minimumPixelCount = Math.ceil(blockArea * this.minimumBlockContentRatio);
                if (pixelCount < minimumPixelCount || pixelCount === blockArea) {
                    continue;
                }

                let bestSAD = Infinity;
                let bestOffset = { dx: 0, dy: 0 };

                // Search a window of candidate offsets (searchRange) in the target frame
                for (let oy = -searchRange; oy <= searchRange; oy++) {
                    for (let ox = -searchRange; ox <= searchRange; ox++) {
                        let candidateX = bx + ox;
                        let candidateY = by + oy;

                        if (candidateX < 0 || candidateY < 0 ||
                            candidateX + blockWidth > targetFrame.width ||
                            candidateY + blockHeight > targetFrame.height) {
                            continue;
                        }

                        // For each candidate, compute SAD between the block's pixels and the candidate region
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

                        // EARLY EXIT: reduce wasted computation on clearly-worse candidates
                        // Offset with the lowest SAD is taken as that block's motion vector
                        if (sad < bestSAD) {
                            bestSAD = sad;
                            bestOffset = { dx: ox, dy: oy };
                        }
                    }
                }

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

        this.blockMotionProcessingTime = millis() - startTime;
        this.blockMotionVectors = vectors;
        this.hasShownDirectionArrows = false;
        this.directionArrowsShownAt = 0;
        return vectors;
    }

    computeCentroid(img) {
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
