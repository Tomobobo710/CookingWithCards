// Card class for advanced card rendering and animations
// Supports both standard playing cards (suit/value) and hotpot cards (category/ingredient)
class Card {
    constructor(suitOrCategory, valueOrIngredient, game, scale = 1) {
        this.game = game || null;

        // Detect hotpot mode: if suitOrCategory is a known hotpot category
        const isHotpot = HOTPOT && HOTPOT.CATEGORIES && HOTPOT.CATEGORIES[suitOrCategory];
        this.isHotpot = isHotpot;

        if (isHotpot) {
            this.category = suitOrCategory;
            this.ingredient = valueOrIngredient;
            this.suit = null;
            this.value = null;
            this.frontColor = HOTPOT.CATEGORIES[this.category].color;
            this.textColor = '#000000';
        } else {
            this.suit = suitOrCategory;
            this.value = valueOrIngredient;
            this.category = null;
            this.ingredient = null;
            this.frontColor = '#ffffff';
            this.textColor = (['♥', '♦'].includes(this.suit)) ? '#e74c3c' : '#2c3e50';
        }

        this.baseWidth = 80;
        this.baseHeight = 115;
        this.scale = scale;
        this.width = this.baseWidth * this.scale;
        this.height = this.baseHeight * this.scale;
        this.borderRadius = 8 * this.scale;

        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.rotation = 0;
        this.targetRotation = 0;
        this.targetScale = scale;

       this.faceUp = true;
        this.animating = false;
        this.highlighted = null;
        this.glowing = false;
        this.glowPhase = 0;

        // Flip animation (self-contained, no game.animation dependency)
        this.flipping = false;
        this.flipProgress = 0;
        this.initialFaceUp = true;
        this.flipSpeed = 0.07;

        this.moveSpeed = 0.1;
        this.rotateSpeed = 0.1;
        this.scaleSpeed = 0.1;

        this.backColor = '#2c3e50';
        this.backPattern = '#1a1a2e';
    }

   moveTo(x, y, immediate = false) {
        this.targetX = x;
        this.targetY = y;
        if (immediate) { this.x = x; this.y = y; }
        else this.animating = true;
    }

    rotateTo(angle, immediate = false) {
        this.targetRotation = angle;
        if (immediate) this.rotation = angle;
        else this.animating = true;
    }

  scaleTo(newScale, immediate = false) {
        this.targetScale = newScale;
        if (immediate) {
            this.scale = newScale;
            this.updateDimensions();
        } else {
            this.animating = true;
        }
    }

    updateDimensions() {
        this.width = this.baseWidth * this.scale;
        this.height = this.baseHeight * this.scale;
        this.borderRadius = 8 * this.scale;
    }

    flip(immediate = false) {
        if (immediate) {
            this.faceUp = !this.faceUp;
            this.flipping = false;
            this.flipProgress = 0;
            return;
        }
        if (this.flipping) return;
        this.initialFaceUp = this.faceUp;
        this.flipProgress = 0;
        this.flipping = true;
        this._flipMidpoint = false;
    }

    update() {
        let stillAnimating = false;

        if (Math.abs(this.x - this.targetX) > 0.1 || Math.abs(this.y - this.targetY) > 0.1) {
            this.x += (this.targetX - this.x) * this.moveSpeed;
            this.y += (this.targetY - this.y) * this.moveSpeed;
            stillAnimating = true;
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }

        if (Math.abs(this.rotation - this.targetRotation) > 0.01) {
            this.rotation += (this.targetRotation - this.rotation) * this.rotateSpeed;
            stillAnimating = true;
        } else {
            this.rotation = this.targetRotation;
        }

        if (Math.abs(this.scale - this.targetScale) > 0.01) {
            this.scale += (this.targetScale - this.scale) * this.scaleSpeed;
            this.updateDimensions();
            stillAnimating = true;
        } else {
            this.scale = this.targetScale;
            this.updateDimensions();
        }

        if (this.flipping) {
            this.flipProgress += this.flipSpeed;
            if (this.flipProgress >= 0.5 && !this._flipMidpoint) {
                this.faceUp = !this.initialFaceUp;
                this._flipMidpoint = true;
            }
            if (this.flipProgress >= 1) {
                this.flipping = false;
                this.flipProgress = 0;
                this._flipMidpoint = false;
            }
            stillAnimating = true;
        }

     if (this.glowing) {
            this.glowPhase += 0.04;
        }

        this.animating = stillAnimating;
        return stillAnimating;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        let flipScale = 1;
        if (this.flipping) {
            flipScale = Math.cos(this.flipProgress * Math.PI);
            if (Math.abs(flipScale) < 0.01) flipScale = 0.01;
            ctx.scale(flipScale, 1);
        }
        const wasMirrored = this.flipping && flipScale < 0;

        const showingFace = this.flipping
            ? (flipScale >= 0 ? this.initialFaceUp : !this.initialFaceUp)
            : this.faceUp;

        ctx.fillStyle = showingFace ? this.frontColor : this.backColor;
        ctx.beginPath();
        this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1 * this.scale;
        ctx.stroke();

        ctx.save();
        if (wasMirrored) ctx.scale(-1, 1);
        if (showingFace) {
            this.drawFace(ctx);
        } else {
            this.drawBack(ctx);
        }
        ctx.restore();

       if (this.highlighted) {
            ctx.save();
            if (wasMirrored) ctx.scale(-1, 1);
            ctx.strokeStyle = this.highlighted === 'triple' ? '#00ff00' : '#00ccff';
            ctx.lineWidth = 4 * this.scale;
            ctx.beginPath();
            this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.stroke();
            ctx.fillStyle = this.highlighted === 'triple' ? 'rgba(0,255,0,0.12)' : 'rgba(0,204,255,0.12)';
            ctx.fill();
            ctx.restore();
        }

        if (this.glowing) {
            ctx.save();
            if (wasMirrored) ctx.scale(-1, 1);
            const pulse = 0.5 + 0.5 * Math.sin(this.glowPhase);
            ctx.shadowColor = HOTPOT.COLORS.GLOW;
            ctx.shadowBlur = 10 + pulse * 12;
            ctx.strokeStyle = HOTPOT.COLORS.GLOW;
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            ctx.lineWidth = 3 * this.scale;
            ctx.beginPath();
            this.drawRoundedRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height) {
        const r = this.borderRadius;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    drawFace(ctx) {
        if (this.isHotpot) {
            this.drawHotpotFace(ctx);
        } else {
            this.drawStandardFace(ctx);
        }
    }

    drawHotpotFace(ctx) {
        const padding = 4 * this.scale;

        // Center: ingredient name (main label)
        ctx.fillStyle = this.textColor;
        ctx.font = `bold ${14 * this.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.ingredient, 0, -this.height / 6);

        // Center below: large ingredient emoji
        ctx.font = `${36 * this.scale}px Arial`;
        ctx.fillText(HOTPOT.CATEGORIES[this.category].ingredients[this.ingredient], 0, this.height * 0.2);

        // Top-right corner: small category icon
        ctx.font = `${11 * this.scale}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(HOTPOT.CATEGORIES[this.category].icon, this.width / 2 - 2 * this.scale, -this.height / 2 + padding);

        // Top-left corner: category name
        ctx.font = `bold ${13 * this.scale}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(this.category, -this.width / 2 + padding, -this.height / 2 + padding);
    }

    drawStandardFace(ctx) {
        ctx.fillStyle = this.textColor;
        const cornerFontSize = this.value === '10' ? 16 * this.scale : 20 * this.scale;
        ctx.font = `${cornerFontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const padding = 5 * this.scale;
        ctx.fillText(this.value, -this.width / 2 + padding, -this.height / 2 + padding);
        ctx.fillText(this.suit, -this.width / 2 + padding, -this.height / 2 + padding * 5);

        ctx.save();
        ctx.translate(this.width / 2 - padding, this.height / 2 - padding);
        ctx.rotate(Math.PI);
        ctx.fillText(this.value, 0, 0);
        ctx.fillText(this.suit, 0, padding * 4);
        ctx.restore();

        this.drawStandardSymbols(ctx);
    }

    drawBack(ctx) {
        ctx.fillStyle = this.backPattern;
        const gridSize = 8 * this.scale;
        const padding = 10 * this.scale;
        for (let x = -this.width / 2 + padding; x < this.width / 2 - padding; x += gridSize * 2) {
            for (let y = -this.height / 2 + padding; y < this.height / 2 - padding; y += gridSize * 2) {
                ctx.fillRect(x, y, gridSize, gridSize);
                ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
            }
        }
        ctx.fillStyle = '#c59b37';
        ctx.beginPath();
        ctx.arc(0, 0, 20 * this.scale, 0, Math.PI * 2);
        ctx.fill();
    }

    drawStandardSymbols(ctx) {
        // Only for standard playing cards — skip for hotpot
        if (!isNaN(parseInt(this.value)) || ['A', 'J', 'Q', 'K'].includes(this.value)) {
            const numValue = isNaN(parseInt(this.value)) ? (this.value === 'A' ? 1 : 10) : parseInt(this.value);
            const fontSize = 19 * this.scale;
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const xSpacing = this.width * 0.1875;
            const ySpacing = this.height * 0.165;
            const positions = this.getSymbolPositions(numValue, xSpacing, ySpacing);
            positions.forEach(pos => ctx.fillText(this.suit, pos.x, pos.y));
        }
    }

    getSymbolPositions(number, xSpacing, ySpacing) {
        switch (number) {
            case 2: return [{ x: 0, y: -ySpacing }, { x: 0, y: ySpacing }];
            case 3: return [{ x: 0, y: -ySpacing }, { x: 0, y: 0 }, { x: 0, y: ySpacing }];
            case 4: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 5: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: 0, y: 0 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 6: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: -xSpacing, y: 0 }, { x: xSpacing, y: 0 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 7: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: 0, y: -ySpacing / 2 }, { x: -xSpacing, y: 0 }, { x: xSpacing, y: 0 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 8: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: -xSpacing, y: -ySpacing / 3 }, { x: xSpacing, y: -ySpacing / 3 }, { x: -xSpacing, y: ySpacing / 3 }, { x: xSpacing, y: ySpacing / 3 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 9: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: -xSpacing, y: -ySpacing / 3 }, { x: xSpacing, y: -ySpacing / 3 }, { x: 0, y: 0 }, { x: -xSpacing, y: ySpacing / 3 }, { x: xSpacing, y: ySpacing / 3 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            case 10: return [{ x: -xSpacing, y: -ySpacing }, { x: xSpacing, y: -ySpacing }, { x: 0, y: -ySpacing * 0.7 }, { x: -xSpacing, y: -ySpacing / 3 }, { x: xSpacing, y: -ySpacing / 3 }, { x: -xSpacing, y: ySpacing / 3 }, { x: xSpacing, y: ySpacing / 3 }, { x: 0, y: ySpacing * 0.7 }, { x: -xSpacing, y: ySpacing }, { x: xSpacing, y: ySpacing }];
            default: return [{ x: 0, y: 0 }];
        }
    }
}





