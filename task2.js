/**
 * EXTENSION
 * METHODS: aggregateBlockMotion, drawBlockMotionVectors, applyBlockMotionEstimation
 * PROS: more advanced than basic motion estimation via centroid
 * CONS: more computationally demanding
 * 
 * MY CHALLENGES: I tried a coarse-to-fine searching to make applyBlockMotionEstimation cheaper:
 * sparsely sampling candidates at a fixed step, then refine around the best results (standard
 * optimisation used in video compression); roughly (2×160/4+1)^2 = 6,561 candidates 
 * instead of the full 321^2 = 103,041.
 * 
 * Testing against the given dataset showed significant inaccuracy. My initial implementation
 * refined only a single best coarse candidate, which I suspected could lock onto the wrong local
 * minimum on a noisy SAD surface. I extended the coarse candidates, thinking this would make 
 * the search more robust to a misleading single best guess. However, this didn't resolve the
 * accuracy loss.
 * 
 * On reflecton, I beleive the underlying issue is not ranking but sampling (which offsets get
 * tested). My block content is not smooth photographic detail but sparse, threshold edge outlines.
 * The true best-matching offset for such content can correspond to a narrow alignment window.  
 * If the coarse sampling step never lands inside that narrow window, no amount of refining around
 * top candidates can estimate the correct direction, because it was never sampled in the first place.
 * Keeping more coarse candidates (I tested 10) did not help, which supports my explanation that
 * the problem is undersampling, not misranking.
 *
 * Given this, I decided to keep the full exhaustive search for correctness, since motion estimation
 * accuracy across all pairs is the priority for this task. I kept the early exit SAD optimisation
 * (abandoning a candidate once its running SAD already exceeds the current best), which reduces
 * computation without any accuracy cost since it never discards a candidate that could still win.
 * 
 * To address the practical performance problem (lag while dragging the threshold slider), I added 
 * debouncing: block motion is only recalculated 200ms after the slider stops moving, rather than on
 * every intermediate value. This solved the responsiveness problem I originally set out to fix,
 * without compromising the estimator's accuracy.
 * 
 * ===================================================================
 * 
 * ISSUE: pair 6 takes more time and causes time discrepancies for other pairs
 * FOUND: pair 6 has more pixels than the others
 * FIX: apply a boolean check to make sure program only transitions to the next image pair 
 *      after drawBlockMotionVectors has passed 3 seconds
 * 
 * FIXED
 * ISSUE: pair 5-8 are not estimated correctly (inconsistent arrows)
 * FOUND: pair 5-8 has bigger leap in centroid values
 * FIX: even bigger searchRange
 */



class Task2 {
    constructor() {
        this.bgColour = 240;
        this.currentImageIndex = 0;
        this.imageLoaded = false;
        this.processed_image = [];

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
        this.thresholdSlider.position(590, 15);
        this.thresholdSlider.input(() => this.onThresholdSliderMoved());

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
        this.blockMotionUpdateTimer = null;
        this.blockMotionDebounceDelay = 200;
        this.hasShownDirectionArrowsForThreeSeconds = false;
        this.directionArrowsShownAt = 0;
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

        // Update the visible threshold immediately, but defer block matching.
        this.updateCachedProcessedImages(false);
        this.blockMotionVectors = [];
        this.blockMotionDirection = "UNDEFINED";

        if (this.blockMotionUpdateTimer !== null) {
            clearTimeout(this.blockMotionUpdateTimer);
        }

        this.blockMotionUpdateTimer = setTimeout(() => {
            this.blockMotionUpdateTimer = null;
            this.updateCachedProcessedImages(true, true);
        }, this.blockMotionDebounceDelay);
    }

    updateCachedProcessedImages(calculateBlockMotion = true, forceUpdate = false) {
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

        if (this.thresholdApplied && calculateBlockMotion) {
            this.blockMotionVectors = this.applyBlockMotionEstimation(source1, source2);
            this.blockMotionDirection = this.aggregateBlockMotion(this.blockMotionVectors);
        } else if (!this.thresholdApplied) {
            this.blockMotionVectors = [];
            this.blockMotionDirection = "UNDEFINED";
        }

        if (this.centroidApplied) {
            let centroid1 = this.computeCentroid(source1);
            let centroid2 = this.computeCentroid(source2);
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
        if (this.imageLoaded && this.processed_image.length > 0) {
            let currentImage1 = this.processed_image[this.currentImageIndex];
            let currentImage2 = this.processed_image[this.currentImageIndex + 1];

            // let scale = 1;
            // let w = currentImage.width * scale;
            // let h = currentImage.height * scale;

            this.updateCachedProcessedImages();
            currentImage1 = this.cachedProcessedImage1 || currentImage1;
            currentImage2 = this.cachedProcessedImage2 || currentImage2;

            let imageX1 = (width - currentImage1.width * 2 - imageGap) / 2;
            let imageX2 = imageX1 + currentImage1.width + imageGap;

            push();
            noStroke();
            fill(18, 30, 42, 190);
            rect(imageX1 - 10, imageY - 30, currentImage1.width + 20, currentImage1.height + 42, 8);
            rect(imageX2 - 10, imageY - 30, currentImage2.width + 20, currentImage2.height + 42, 8);
            fill(255, 220, 150);
            textAlign(LEFT, CENTER);
            textSize(13);
            textStyle(BOLD);
            text("REFERENCE FRAME", imageX1, imageY - 14);
            text("TARGET FRAME", imageX2, imageY - 14);
            pop();

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
                    this.drawDirectionArrow(direction, directionX, directionY + 20);
                }

                // EXTENSION
                this.hasShownDirectionArrowsForThreeSeconds = this.drawBlockMotionVectors(
                    imageX2,
                    imageY,
                    this.hasShownDirectionArrowsForThreeSeconds
                );
                text(`Block-based Estimated Direction: ${this.blockMotionDirection}`, directionX, directionY + 40);

            }
        }

        push();
        textAlign(CENTER, CENTER);
        textSize(13);
        fill(20, 35, 45, 220);
        rect(190, height - 76, 520, 48, 8);
        fill(255);
        textStyle(BOLD);
        text(`PAIR ${(this.currentImageIndex / 2) + 1} OF ${this.processed_image.length / 2}`, 320, height - 52);
        fill(185, 205, 210);
        textStyle(NORMAL);
        text("Left / Right arrows to navigate", 555, height - 52);
        pop();
        this.drawModeSelection();
    }

    drawModeSelection() {
        let panelW = 285;
        let panelH = 230;
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
        text("D   display arrows", panelX + 18, panelY + 174);
        text("LEFT / RIGHT   change pair", panelX + 18, panelY + 198);

        pop();
        textAlign(CENTER, CENTER);
        textStyle(NORMAL);
    }

    nextPair() {
        if (!this.imageLoaded || this.processed_image.length < 2) {
            return;
        }

        let pairCount = this.processed_image.length / 2;
        let currentPair = this.currentImageIndex / 2;
        this.currentImageIndex = ((currentPair + 1) % pairCount) * 2;
        this.resetBlockMotionDisplay();
    }

    previousPair() {
        if (!this.imageLoaded || this.processed_image.length < 2) {
            return;
        }

        let pairCount = this.processed_image.length / 2;
        let currentPair = this.currentImageIndex / 2;
        this.currentImageIndex = ((currentPair - 1 + pairCount) % pairCount) * 2;
        this.resetBlockMotionDisplay();
    }

    resetBlockMotionDisplay() {
        this.blockMotionVectors = [];
        this.blockMotionDirection = "UNDEFINED";
        this.hasShownDirectionArrowsForThreeSeconds = false;
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
        hasShownDirectionArrowsForThreeSeconds = false
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

        if (!hasShownDirectionArrowsForThreeSeconds &&
            millis() - this.directionArrowsShownAt >= 3000) {
            hasShownDirectionArrowsForThreeSeconds = true;
        }

        return hasShownDirectionArrowsForThreeSeconds;
    }

    /**
     * Block-based motion estimation using Sum of Absolute Differences
     * 
     * Divides the reference frame into a grid of fixed-size blocks
     * Independently estimate how each block moved between two frames
     * Reveals whether motion is uniform across the image (pure translation) 
     * or varies spatially (due to scale change, rotation, or non-rigid movement)
     * 
     * PERFORMANCE NOTE
     * Candidate count per block is (2*searchRange+1)^2
     * This is the most computationally expensive part of the extension
     * searchRange must be large enough to cover the largest expected displacement
     * between frames, or the matcher cannot find the true position at all.`
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

        referenceFrame.loadPixels();
        targetFrame.loadPixels();

        let vectors = [];

        // DEBUG
        let totalPixelsAboveZero = 0;
        let totalBlocksConsidered = 0;
        let totalBlocksSearched = 0;

        // bx = blockX; by = blockY
        for (let by = 0; by < referenceFrame.height; by += blockSize) {
            for (let bx = 0; bx < referenceFrame.width; bx += blockSize) {
                let blockWidth = min(blockSize, referenceFrame.width - bx);
                let blockHeight = min(blockSize, referenceFrame.height - by);
                let blockArea = blockWidth * blockHeight;
                let pixelCount = 0;

                // Count non-zero (thresholded) pixels
                for (let y = 0; y < blockHeight; y++) {
                    for (let x = 0; x < blockWidth; x++) {
                        totalBlocksConsidered++;

                        let referenceIndex = ((by + y) * referenceFrame.width + bx + x) * 4;
                        if (referenceFrame.pixels[referenceIndex] > 0) {
                            pixelCount++;
                        }
                    }
                }

                totalPixelsAboveZero += pixelCount;

                // Blocks with too little content or too much are skipped
                let minimumPixelCount = Math.ceil(blockArea * this.minimumBlockContentRatio);
                if (pixelCount < minimumPixelCount || pixelCount === blockArea) {
                    continue;
                }

                totalBlocksSearched++;

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

        console.log(
            `Motion estimation summary — ` +
            `pixels>0: ${totalPixelsAboveZero}, ` +
            `blocks total: ${totalBlocksConsidered}, ` +
            `blocks searched: ${totalBlocksSearched}, ` +
            `searchRange: ${searchRange}`
        );

        this.blockMotionVectors = vectors;
        this.hasShownDirectionArrowsForThreeSeconds = false;
        this.directionArrowsShownAt = 0;
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
