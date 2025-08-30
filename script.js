class InteractiveCircleSystem {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // 系统参数
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.canvas.width, this.canvas.height) / 4;
        
        // 曲线和交点数据
        this.curves = [];
        this.intersections = [];
        this.totalIntersections = 40; // 20条曲线 × 每条2个交点
        
        // 交互状态
        this.selectedCurve = null;
        this.animationProgress = 0;
        this.isAnimating = false;
        this.mousePos = { x: 0, y: 0 };
        this.lastClickPos = { x: 0, y: 0 };
        
        // 数字方格状态
        this.gridState = []; // 存储右下方格的状态
        this.upperGridState = []; // 存储右上方格的状态
        this.currentGroup = 0; // 当前正在填入的组
        
        // 语言设置
        this.currentLanguage = 'english'; // 默认英文
        this.texts = {
            chinese: {
                title: '填数字，曲线消失',
                instructions: '找圆上与曲线的交点，点击右下角的数字使其填到右上方的方格中'
            },
            english: {
                title: 'Fill Numbers, Curves Disappear',
                instructions: 'Find intersection points of curves on the circle, click numbers in the bottom-right corner to fill them into the grid in the top-right corner'
            }
        };
        
        this.init();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // 添加事件监听器
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('resize', () => this.handleResize());
    }
    
    init() {
        this.createGrids();
        this.generateCurves();
        this.generateIntersections();
        this.setupLanguageToggle();
        this.render();
    }
    
    setupLanguageToggle() {
        const languageToggle = document.getElementById('languageToggle');
        languageToggle.addEventListener('click', () => this.toggleLanguage());
    }
    
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'english' ? 'chinese' : 'english';
        this.updateTexts();
    }
    
    updateTexts() {
        const titleElement = document.getElementById('gameTitle');
        const instructionsElement = document.getElementById('gameInstructions');
        
        const currentTexts = this.texts[this.currentLanguage];
        titleElement.textContent = currentTexts.title;
        instructionsElement.textContent = currentTexts.instructions;
    }
    
    createGrids() {
        // 创建右下方带数字的方格
        const numberedGrid = document.getElementById('numberedGrid');
        const gridSize = Math.ceil(Math.sqrt(this.totalIntersections));
        numberedGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        
        for (let i = 1; i <= this.totalIntersections; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = i;
            cell.dataset.number = i;
            cell.dataset.index = i - 1;
            cell.addEventListener('click', (e) => this.handleNumberClick(e));
            numberedGrid.appendChild(cell);
            
            // 初始化格子状态
            this.gridState.push({
                number: i,
                visible: true,
                deleted: false,
                element: cell
            });
        }
        
        // 创建右上方无数字的方格（两个为一组）
        const unnumberedGrid = document.getElementById('unnumberedGrid');
        const groupCount = 20; // 20组，每组2个（对应20条曲线）
        unnumberedGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        
        for (let i = 0; i < groupCount * 2; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell empty';
            cell.dataset.group = Math.floor(i / 2);
            cell.dataset.position = i % 2;
            unnumberedGrid.appendChild(cell);
            
            // 初始化上方格子状态
            if (i % 2 === 0) {
                this.upperGridState.push({
                    numbers: [null, null],
                    elements: [cell, null],
                    group: Math.floor(i / 2)
                });
            } else {
                this.upperGridState[Math.floor(i / 2)].elements[1] = cell;
            }
        }
    }
    
    generateCurves() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
            '#A9DFBF', '#F9E79F', '#AED6F1', '#F5B7B1', '#D5A6BD'
        ];
        
        for (let i = 0; i < 20; i++) {
            const curve = this.createRandomCurve(colors[i]);
            this.curves.push(curve);
        }
    }
    
    createRandomCurve(color) {
        // 生成随机曲线参数，确保与圆有两个交点
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = angle1 + Math.PI + (Math.random() - 0.5) * Math.PI * 0.5;
        
        // 计算起点和终点，确保曲线穿过圆
        const startRadius = this.radius * (1.5 + Math.random() * 0.5);
        const endRadius = this.radius * (1.5 + Math.random() * 0.5);
        
        const startX = this.centerX + Math.cos(angle1) * startRadius;
        const startY = this.centerY + Math.sin(angle1) * startRadius;
        const endX = this.centerX + Math.cos(angle2) * endRadius;
        const endY = this.centerY + Math.sin(angle2) * endRadius;
        
        // 控制点
        const controlX = this.centerX + (Math.random() - 0.5) * this.radius;
        const controlY = this.centerY + (Math.random() - 0.5) * this.radius;
        
        return {
            startX, startY, endX, endY, controlX, controlY, color,
            lineWidth: 2,
            scale: 1,
            visible: true
        };
    }
    
    generateIntersections() {
        // 收集所有交点
        const allIntersections = [];
        
        this.curves.forEach((curve, curveIndex) => {
            const intersections = this.findCircleIntersections(curve);
            intersections.forEach(point => {
                allIntersections.push({
                    x: point.x,
                    y: point.y,
                    curveIndex,
                    scale: 1,
                    visible: true
                });
            });
        });
        
        // 按顺时针角度排序所有交点
        allIntersections.sort((a, b) => {
            const angleA = Math.atan2(a.y - this.centerY, a.x - this.centerX);
            const angleB = Math.atan2(b.y - this.centerY, b.x - this.centerX);
            
            // 将角度转换为 0 到 2π 的范围（从右侧开始顺时针）
            const normalizedA = angleA < 0 ? angleA + 2 * Math.PI : angleA;
            const normalizedB = angleB < 0 ? angleB + 2 * Math.PI : angleB;
            
            return normalizedA - normalizedB;
        });
        
        // 按顺时针顺序分配编号
        this.intersections = allIntersections.map((point, index) => ({
            ...point,
            number: index + 1
        }));
    }
    
    findCircleIntersections(curve) {
        // 简化的交点计算 - 在实际实现中需要更精确的数学计算
        const intersections = [];
        const steps = 1000;
        
        for (let t = 0; t <= 1; t += 1/steps) {
            const point = this.getBezierPoint(curve, t);
            const distance = Math.sqrt(
                Math.pow(point.x - this.centerX, 2) + 
                Math.pow(point.y - this.centerY, 2)
            );
            
            if (Math.abs(distance - this.radius) < 2 && intersections.length < 2) {
                // 检查是否太接近已有交点
                const tooClose = intersections.some(existing => 
                    Math.sqrt(Math.pow(existing.x - point.x, 2) + Math.pow(existing.y - point.y, 2)) < 20
                );
                
                if (!tooClose) {
                    intersections.push({x: point.x, y: point.y});
                }
            }
        }
        
        // 确保每条曲线有两个交点
        while (intersections.length < 2) {
            const angle = Math.random() * Math.PI * 2;
            intersections.push({
                x: this.centerX + Math.cos(angle) * this.radius,
                y: this.centerY + Math.sin(angle) * this.radius
            });
        }
        
        return intersections.slice(0, 2);
    }
    
    getBezierPoint(curve, t) {
        const x = Math.pow(1-t, 2) * curve.startX + 
                 2 * (1-t) * t * curve.controlX + 
                 Math.pow(t, 2) * curve.endX;
        const y = Math.pow(1-t, 2) * curve.startY + 
                 2 * (1-t) * t * curve.controlY + 
                 Math.pow(t, 2) * curve.endY;
        return {x, y};
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        this.lastClickPos = { x: clickX, y: clickY };
        
        // 检查点击是否在某条曲线上
        const clickedCurve = this.findCurveAtPoint(clickX, clickY);
        if (clickedCurve !== null) {
            this.selectedCurve = clickedCurve;
            this.startAnimation();
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // 如果鼠标移动且有选中的曲线，直接隐藏曲线和编号
        if (this.selectedCurve !== null) {
            this.hideCurveAndLabels();
        }
    }
    
    handleNumberClick(e) {
        e.stopPropagation();
        const clickedNumber = parseInt(e.target.dataset.number);
        const index = parseInt(e.target.dataset.index);
        
        // 检查数字是否还可见或已被删除
        if (!this.gridState[index].visible || this.gridState[index].deleted) return;
        
        // 检查该数字对应的交点是否还存在（曲线是否已被删除）
        const correspondingIntersection = this.intersections.find(i => i.number === clickedNumber);
        if (!correspondingIntersection) {
            console.log(`数字 ${clickedNumber} 对应的曲线已删除，无法添加`);
            return;
        }
        
        // 隐藏被点击的数字
        this.gridState[index].visible = false;
        this.gridState[index].element.textContent = '';
        this.gridState[index].element.classList.add('empty');
        
        // 将数字移动到右上方的当前组
        this.moveNumberToUpperGrid(clickedNumber);
    }
    
    moveNumberToUpperGrid(number) {
        // 找到当前组的第一个空位
        const currentGroupState = this.upperGridState[this.currentGroup];
        
        if (currentGroupState.numbers[0] === null) {
            // 放入第一个位置
            currentGroupState.numbers[0] = number;
            currentGroupState.elements[0].textContent = number;
            currentGroupState.elements[0].classList.remove('empty');
        } else if (currentGroupState.numbers[1] === null) {
            // 放入第二个位置
            currentGroupState.numbers[1] = number;
            currentGroupState.elements[1].textContent = number;
            currentGroupState.elements[1].classList.remove('empty');
            
            // 检查这两个数字是否在同一条曲线上
            this.checkSameLine(this.currentGroup);
        }
    }
    
    checkSameLine(groupIndex) {
        const group = this.upperGridState[groupIndex];
        const num1 = group.numbers[0];
        const num2 = group.numbers[1];
        
        // 找到这两个数字对应的交点
        const intersection1 = this.intersections.find(i => i.number === num1);
        const intersection2 = this.intersections.find(i => i.number === num2);
        
        if (intersection1 && intersection2) {
            // 检查是否属于同一条曲线
            if (intersection1.curveIndex === intersection2.curveIndex) {
                // 两个数字在同一条曲线上，删除圆中的曲线及交点
                this.removeCurveByIndex(intersection1.curveIndex);
                this.currentGroup++;
                console.log(`数字 ${num1} 和 ${num2} 在同一条曲线上！圆中的曲线及交点已删除`);
            } else {
                // 不在同一条曲线上，返回到下方
                this.returnNumbersToBottom(groupIndex);
            }
        }
    }
    
    returnNumbersToBottom(groupIndex) {
        const group = this.upperGridState[groupIndex];
        const num1 = group.numbers[0];
        const num2 = group.numbers[1];
        
        // 将数字返回到右下方
        if (num1 !== null) {
            const index1 = num1 - 1;
            this.gridState[index1].visible = true;
            this.gridState[index1].element.textContent = num1;
            this.gridState[index1].element.classList.remove('empty');
        }
        
        if (num2 !== null) {
            const index2 = num2 - 1;
            this.gridState[index2].visible = true;
            this.gridState[index2].element.textContent = num2;
            this.gridState[index2].element.classList.remove('empty');
        }
        
        // 清空上方格子
        group.numbers = [null, null];
        group.elements[0].textContent = '';
        group.elements[0].classList.add('empty');
        group.elements[1].textContent = '';
        group.elements[1].classList.add('empty');
        
        console.log(`数字 ${num1} 和 ${num2} 不在同一条曲线上，已返回下方`);
    }
    
    removeCurveByIndex(curveIndex) {
        // 完全移除指定索引的曲线（消失效果）
        
        // 先收集要移除的交点编号
        const numbersToRemove = [];
        this.intersections.forEach(intersection => {
            if (intersection.curveIndex === curveIndex) {
                numbersToRemove.push(intersection.number);
            }
        });
        
        // 从curves数组中移除曲线
        if (this.curves[curveIndex]) {
            this.curves.splice(curveIndex, 1);
        }
        
        // 移除该曲线的所有相关交点，并更新其他交点的curveIndex
        this.intersections = this.intersections.filter(intersection => {
            if (intersection.curveIndex === curveIndex) {
                return false; // 移除这个交点
            } else if (intersection.curveIndex > curveIndex) {
                // 更新后续曲线的索引
                intersection.curveIndex--;
                return true;
            }
            return true;
        });
        
        // 完全删除右下方格中的对应数字格子
        numbersToRemove.forEach(number => {
            const gridIndex = number - 1;
            if (this.gridState[gridIndex]) {
                this.gridState[gridIndex].element.style.display = 'none';
                this.gridState[gridIndex].visible = false;
                this.gridState[gridIndex].deleted = true; // 标记为已删除
            }
        });
        
        // 重新渲染
        this.render();
    }
    
    hideCurveByIndex(curveIndex) {
        // 临时隐藏指定索引的曲线（用于点击交互）
        if (this.curves[curveIndex]) {
            this.curves[curveIndex].visible = false;
        }
        
        // 隐藏该曲线的所有相关交点
        this.intersections.forEach(intersection => {
            if (intersection.curveIndex === curveIndex) {
                intersection.visible = false;
            }
        });
        
        // 重新渲染
        this.render();
    }
    
    findCurveAtPoint(x, y) {
        const tolerance = 10;
        
        for (let i = 0; i < this.curves.length; i++) {
            const curve = this.curves[i];
            
            // 检查点是否在曲线路径附近
            for (let t = 0; t <= 1; t += 0.01) {
                const point = this.getBezierPoint(curve, t);
                const distance = Math.sqrt(
                    Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2)
                );
                
                if (distance <= tolerance) {
                    return i;
                }
            }
        }
        return null;
    }
    
    startAnimation() {
        this.isAnimating = true;
        this.animationProgress = 0;
        this.animateScale();
    }
    
    hideCurveAndLabels() {
        // 立即删除选中的曲线和相关交点编号，并自动移动数字到上方
        if (this.selectedCurve !== null) {
            const curveIndex = this.selectedCurve;
            
            // 获取该曲线相关的交点编号
            const relatedNumbers = [];
            this.intersections.forEach(intersection => {
                if (intersection.curveIndex === curveIndex) {
                    relatedNumbers.push(intersection.number);
                }
            });
            
            // 删除这条曲线和相关交点
            this.removeCurveByIndex(curveIndex);
            
            // 自动将这些数字移动到上方并标记为粉色
            this.autoMoveNumbersToUpper(relatedNumbers, curveIndex);
            
            this.selectedCurve = null;
            this.render();
        }
    }
    
    autoMoveNumbersToUpper(numbers, curveIndex) {
        // 确保有可用的组来放置数字
        if (this.currentGroup >= this.upperGridState.length) {
            console.log('没有足够的组来放置数字');
            return;
        }
        
        const currentGroupState = this.upperGridState[this.currentGroup];
        
        // 移动数字到上方
        numbers.forEach((number, index) => {
            if (index < 2) { // 每组最多2个数字
                // 从右下方隐藏数字
                const gridIndex = number - 1;
                if (this.gridState[gridIndex].visible) {
                    this.gridState[gridIndex].visible = false;
                    this.gridState[gridIndex].element.textContent = '';
                    this.gridState[gridIndex].element.classList.add('empty');
                }
                
                // 移动到上方对应位置
                currentGroupState.numbers[index] = number;
                currentGroupState.elements[index].textContent = number;
                currentGroupState.elements[index].classList.remove('empty');
                currentGroupState.elements[index].classList.add('auto-filled'); // 添加特殊样式标记
            }
        });
        
        // 如果填满了一组，自动验证并移动到下一组
        if (currentGroupState.numbers[0] !== null && currentGroupState.numbers[1] !== null) {
            // 由于这些数字来自同一条曲线，不需要再次隐藏曲线（已经隐藏了）
            this.currentGroup++;
            console.log(`自动填入数字 ${numbers.join(' 和 ')}，曲线已删除`);
        }
    }
    
    animateScale() {
        if (this.animationProgress < 1) {
            this.animationProgress += 0.05;
            
            if (this.selectedCurve !== null) {
                this.curves[this.selectedCurve].scale = 1 + this.animationProgress * 0.5;
                this.curves[this.selectedCurve].lineWidth = 2 + this.animationProgress * 3;
                
                // 放大相关交点
                this.intersections.forEach(intersection => {
                    if (intersection.curveIndex === this.selectedCurve) {
                        intersection.scale = 1 + this.animationProgress * 0.8;
                    }
                });
            }
            
            this.render();
            requestAnimationFrame(() => this.animateScale());
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制圆
        this.drawCircle();
        
        // 绘制曲线
        this.drawCurves();
        
        // 绘制交点
        this.drawIntersections();
    }
    
    drawCircle() {
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    drawCurves() {
        this.curves.forEach((curve, index) => {
            if (curve.visible) {
                this.ctx.beginPath();
                this.ctx.moveTo(curve.startX, curve.startY);
                this.ctx.quadraticCurveTo(curve.controlX, curve.controlY, curve.endX, curve.endY);
                this.ctx.strokeStyle = curve.color;
                this.ctx.lineWidth = curve.lineWidth * curve.scale;
                this.ctx.stroke();
            }
        });
    }
    
    drawIntersections() {
        this.intersections.forEach(intersection => {
            if (intersection.visible) {
                const baseSize = 6;
                const size = baseSize * intersection.scale;
                
                // 绘制交点圆圈
                this.ctx.beginPath();
                this.ctx.arc(intersection.x, intersection.y, size, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FF4444';
                this.ctx.fill();
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // 计算编号显示位置（避免重叠）
                const labelOffset = this.calculateLabelOffset(intersection);
                const labelX = intersection.x + labelOffset.x;
                const labelY = intersection.y + labelOffset.y;
                
                // 绘制编号背景
                const fontSize = Math.max(14, 14 * intersection.scale);
                this.ctx.font = `bold ${fontSize}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                const textMetrics = this.ctx.measureText(intersection.number.toString());
                const padding = 4;
                const bgWidth = textMetrics.width + padding * 2;
                const bgHeight = fontSize + padding * 2;
                
                // 绘制白色背景
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.fillRect(
                    labelX - bgWidth / 2, 
                    labelY - bgHeight / 2, 
                    bgWidth, 
                    bgHeight
                );
                
                // 绘制边框
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    labelX - bgWidth / 2, 
                    labelY - bgHeight / 2, 
                    bgWidth, 
                    bgHeight
                );
                
                // 绘制编号文字
                this.ctx.fillStyle = '#333';
                this.ctx.fillText(intersection.number, labelX, labelY);
            }
        });
    }
    
    calculateLabelOffset(intersection) {
        // 计算交点相对于圆心的角度
        const angle = Math.atan2(intersection.y - this.centerY, intersection.x - this.centerX);
        
        // 基础偏移距离
        const baseDistance = 25;
        const distance = baseDistance * intersection.scale;
        
        // 根据角度计算偏移方向，确保标签在圆外侧
        let offsetX = Math.cos(angle) * distance;
        let offsetY = Math.sin(angle) * distance;
        
        // 检查是否与其他标签重叠，如果重叠则调整位置
        const adjustedOffset = this.adjustForOverlap(intersection, offsetX, offsetY, distance);
        
        return adjustedOffset;
    }
    
    adjustForOverlap(currentIntersection, offsetX, offsetY, distance) {
        const labelX = currentIntersection.x + offsetX;
        const labelY = currentIntersection.y + offsetY;
        const minDistance = 30; // 最小间距
        
        // 检查与其他交点标签的距离
        for (const other of this.intersections) {
            if (other === currentIntersection) continue;
            
            const otherOffset = this.getStoredOffset(other);
            if (!otherOffset) continue;
            
            const otherLabelX = other.x + otherOffset.x;
            const otherLabelY = other.y + otherOffset.y;
            
            const distanceToOther = Math.sqrt(
                Math.pow(labelX - otherLabelX, 2) + 
                Math.pow(labelY - otherLabelY, 2)
            );
            
            if (distanceToOther < minDistance) {
                // 如果重叠，尝试不同的角度偏移
                const baseAngle = Math.atan2(offsetY, offsetX);
                const angleAdjustments = [Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2];
                
                for (const angleAdjust of angleAdjustments) {
                    const newAngle = baseAngle + angleAdjust;
                    const newOffsetX = Math.cos(newAngle) * distance;
                    const newOffsetY = Math.sin(newAngle) * distance;
                    const newLabelX = currentIntersection.x + newOffsetX;
                    const newLabelY = currentIntersection.y + newOffsetY;
                    
                    const newDistance = Math.sqrt(
                        Math.pow(newLabelX - otherLabelX, 2) + 
                        Math.pow(newLabelY - otherLabelY, 2)
                    );
                    
                    if (newDistance >= minDistance) {
                        offsetX = newOffsetX;
                        offsetY = newOffsetY;
                        break;
                    }
                }
            }
        }
        
        // 存储计算的偏移量
        this.storeOffset(currentIntersection, { x: offsetX, y: offsetY });
        
        return { x: offsetX, y: offsetY };
    }
    
    storeOffset(intersection, offset) {
        if (!this.labelOffsets) {
            this.labelOffsets = new Map();
        }
        this.labelOffsets.set(intersection, offset);
    }
    
    getStoredOffset(intersection) {
        if (!this.labelOffsets) {
            return null;
        }
        return this.labelOffsets.get(intersection);
    }
    
    handleResize() {
        this.setupCanvas();
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.canvas.width, this.canvas.height) / 4;
        this.generateCurves();
        this.generateIntersections();
        this.render();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new InteractiveCircleSystem();
});