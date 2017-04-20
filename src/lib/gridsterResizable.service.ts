import {Injectable} from '@angular/core';
import {GridsterItemComponent} from './gridsterItem.component';
import {scroll, cancelScroll} from './gridsterScroll.service';
import {GridsterItem} from './gridsterItem.interface';
import {GridsterResizeEventType} from './gridsterResizeEventType.interface';
import {GridsterPush} from './gridsterPush.service';

@Injectable()
export class GridsterResizable {
  gridsterItem: GridsterItemComponent;
  itemCopy: GridsterItem;
  lastMouse: {
    pageX: number,
    pageY: number
  };
  elemPosition: Array<number>;
  position: Array<number>;
  itemBackup: Array<number>;
  enabled: boolean;
  resizeEventScrollType: GridsterResizeEventType;
  directionFunction: Function;
  dragFunction: (event: any) => void;
  dragStopFunction: (event: any) => void;
  resizeEnabled: boolean;
  mousemove: Function;
  mouseup: Function;
  touchmove: Function;
  touchend: Function;
  touchcancel: Function;
  mousedown: Function;
  touchstart: Function;
  push: GridsterPush;

  static touchEvent(e) {
    e.pageX = e.touches[0].pageX;
    e.pageY = e.touches[0].pageY;
  }

  constructor(gridsterItem: GridsterItemComponent) {
    this.gridsterItem = gridsterItem;
    this.lastMouse = {
      pageX: 0,
      pageY: 0
    };
    this.elemPosition = [0, 0, 0, 0];
    this.position = [0, 0];
    this.itemBackup = [0, 0, 0, 0];
    this.resizeEventScrollType = {w: false, e: false, n: false, s: false};
  }

  dragStart(e): void {
    switch (e.which) {
      case 1:
        // left mouse button
        break;
      case 2:
      case 3:
        // right or middle mouse button
        return;
    }
    e.stopPropagation();
    if (e.pageX === undefined && e.touches) {
      GridsterResizable.touchEvent(e);
    }
    this.dragFunction = this.dragMove.bind(this);
    this.dragStopFunction = this.dragStop.bind(this);
    this.mousemove = this.gridsterItem.renderer.listen('document', 'mousemove', this.dragFunction);
    this.mouseup = this.gridsterItem.renderer.listen('document', 'mouseup', this.dragStopFunction);
    this.touchmove = this.gridsterItem.renderer.listen('document', 'touchmove', this.dragFunction);
    this.touchend = this.gridsterItem.renderer.listen('document', 'touchend', this.dragStopFunction);
    this.touchcancel = this.gridsterItem.renderer.listen('document', 'touchcancel', this.dragStopFunction);
    this.gridsterItem.renderer.addClass(this.gridsterItem.el, 'gridster-item-resizing');
    this.lastMouse.pageX = e.pageX;
    this.lastMouse.pageY = e.pageY;
    this.elemPosition[0] = this.gridsterItem.left;
    this.elemPosition[1] = this.gridsterItem.top;
    this.elemPosition[2] = this.gridsterItem.width;
    this.elemPosition[3] = this.gridsterItem.height;
    this.itemCopy = JSON.parse(JSON.stringify(this.gridsterItem.$item, ['rows', 'cols', 'x', 'y']));
    this.gridsterItem.gridster.movingItem = this.gridsterItem;
    this.gridsterItem.gridster.previewStyle();
    this.push = new GridsterPush();

    if (e.srcElement.classList.contains('handle-n')) {
      this.resizeEventScrollType.n = true;
      this.directionFunction = this.handleN.bind(this);
    } else if (e.srcElement.classList.contains('handle-w')) {
      this.resizeEventScrollType.w = true;
      this.directionFunction = this.handleW.bind(this);
    } else if (e.srcElement.classList.contains('handle-s')) {
      this.resizeEventScrollType.s = true;
      this.directionFunction = this.handleS.bind(this);
    } else if (e.srcElement.classList.contains('handle-e')) {
      this.resizeEventScrollType.e = true;
      this.directionFunction = this.handleE.bind(this);
    } else if (e.srcElement.classList.contains('handle-nw')) {
      this.resizeEventScrollType.n = true;
      this.resizeEventScrollType.w = true;
      this.directionFunction = this.handleNW.bind(this);
    } else if (e.srcElement.classList.contains('handle-ne')) {
      this.resizeEventScrollType.n = true;
      this.resizeEventScrollType.e = true;
      this.directionFunction = this.handleNE.bind(this);
    } else if (e.srcElement.classList.contains('handle-sw')) {
      this.resizeEventScrollType.s = true;
      this.resizeEventScrollType.w = true;
      this.directionFunction = this.handleSW.bind(this);
    } else if (e.srcElement.classList.contains('handle-se')) {
      this.resizeEventScrollType.s = true;
      this.resizeEventScrollType.e = true;
      this.directionFunction = this.handleSE.bind(this);
    }
  }

  dragMove(e): void {
    e.stopPropagation();
    if (e.pageX === undefined && e.touches) {
      GridsterResizable.touchEvent(e);
    }

    scroll(this.elemPosition, this.gridsterItem, e, this.lastMouse, this.directionFunction, true,
      this.resizeEventScrollType);

    this.directionFunction(e);

    this.lastMouse.pageX = e.pageX;
    this.lastMouse.pageY = e.pageY;
  }

  dragStop(e): void {
    e.stopPropagation();
    cancelScroll();
    this.mousemove();
    this.mouseup();
    this.touchmove();
    this.touchend();
    this.touchcancel();
    this.gridsterItem.renderer.removeClass(this.gridsterItem.el, 'gridster-item-resizing');
    this.gridsterItem.gridster.movingItem = null;
    this.gridsterItem.gridster.previewStyle();
    if (this.gridsterItem.gridster.$options.resizable.stop) {
      Promise.resolve(this.gridsterItem.gridster.$options.resizable.stop(this.gridsterItem.item, this.gridsterItem, e))
        .then(this.makeResize.bind(this), this.cancelResize.bind(this));
    } else {
      this.makeResize();
    }
  }

  cancelResize(): void {
    this.gridsterItem.$item.cols = this.itemCopy.cols;
    this.gridsterItem.$item.rows = this.itemCopy.rows;
    this.gridsterItem.$item.x = this.itemCopy.x;
    this.gridsterItem.$item.y = this.itemCopy.y;
    this.gridsterItem.setSize(true);
    this.push.restoreItems();
  }

  makeResize(): void {
    this.gridsterItem.setSize(true);
    this.gridsterItem.checkItemChanges(this.gridsterItem.$item, this.itemCopy);
    this.push.setPushedItems();
  }

  handleN(e): void {
    this.elemPosition[1] += e.pageY - this.lastMouse.pageY;
    this.elemPosition[3] += this.lastMouse.pageY - e.pageY;
    this.position = this.gridsterItem.gridster.pixelsToPosition(this.elemPosition[0], this.elemPosition[1], Math.floor);
    if (this.gridsterItem.$item.y !== this.position[1]) {
      this.itemBackup[1] = this.gridsterItem.$item.y;
      this.itemBackup[3] = this.gridsterItem.$item.rows;
      this.gridsterItem.$item.rows += this.gridsterItem.$item.y - this.position[1];
      this.gridsterItem.$item.y = this.position[1];
      if (this.gridsterItem.$item.y < 0 || this.gridsterItem.$item.rows < 1 ||
        this.gridsterItem.gridster.checkCollision(this.gridsterItem)) {
        this.gridsterItem.$item.y = this.itemBackup[1];
        this.gridsterItem.$item.rows = this.itemBackup[3];
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'top', this.gridsterItem.gridster.positionYToPixels(this.gridsterItem.$item.y) + 'px');
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'height', this.gridsterItem.gridster.positionYToPixels(this.gridsterItem.$item.rows)
          - this.gridsterItem.gridster.$options.margin + 'px');
        return;
      } else {
        this.gridsterItem.gridster.previewStyle();
      }
    }
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'top', this.elemPosition[1] + 'px');
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'height', this.elemPosition[3] + 'px');
  }

  handleW(e): void {
    this.elemPosition[0] += e.pageX - this.lastMouse.pageX;
    this.elemPosition[2] += this.lastMouse.pageX - e.pageX;
    this.position = this.gridsterItem.gridster.pixelsToPosition(this.elemPosition[0], this.elemPosition[1], Math.floor);
    if (this.gridsterItem.$item.x !== this.position[0]) {
      this.itemBackup[0] = this.gridsterItem.$item.x;
      this.itemBackup[2] = this.gridsterItem.$item.cols;
      this.gridsterItem.$item.cols += this.gridsterItem.$item.x - this.position[0];
      this.gridsterItem.$item.x = this.position[0];
      if (this.gridsterItem.$item.x < 0 || this.gridsterItem.$item.cols < 1 ||
        this.gridsterItem.gridster.checkCollision(this.gridsterItem)) {
        this.gridsterItem.$item.x = this.itemBackup[0];
        this.gridsterItem.$item.cols = this.itemBackup[2];
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'left', this.gridsterItem.gridster.positionXToPixels(this.gridsterItem.$item.x) + 'px');
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'width', this.gridsterItem.gridster.positionXToPixels(this.gridsterItem.$item.cols)
          - this.gridsterItem.gridster.$options.margin + 'px');
        return;
      } else {
        this.gridsterItem.gridster.previewStyle();
      }
    }
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'left', this.elemPosition[0] + 'px');
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'width', this.elemPosition[2] + 'px');
  }

  handleS(e): void {
    this.elemPosition[3] += e.pageY - this.lastMouse.pageY;
    this.position = this.gridsterItem.gridster.pixelsToPosition(this.elemPosition[0],
      this.elemPosition[1] + this.elemPosition[3], Math.ceil);
    if ((this.gridsterItem.$item.y + this.gridsterItem.$item.rows) !== this.position[1]) {
      this.itemBackup[3] = this.gridsterItem.$item.rows;
      this.gridsterItem.$item.rows = this.position[1] - this.gridsterItem.$item.y;
      this.push.pushItems(this.gridsterItem);
      if (this.gridsterItem.$item.rows < 1 || this.gridsterItem.gridster.checkCollision(this.gridsterItem)) {
        this.gridsterItem.$item.rows = this.itemBackup[3];
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'height', this.gridsterItem.gridster.positionYToPixels(this.gridsterItem.$item.rows)
          - this.gridsterItem.gridster.$options.margin + 'px');
        return;
      } else {
        this.gridsterItem.gridster.previewStyle();
      }
    }
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'height', this.elemPosition[3] + 'px');
  }

  handleE(e): void {
    this.elemPosition[2] += e.pageX - this.lastMouse.pageX;
    this.position = this.gridsterItem.gridster.pixelsToPosition(this.elemPosition[0] + this.elemPosition[2],
      this.elemPosition[1], Math.ceil);
    if ((this.gridsterItem.$item.x + this.gridsterItem.$item.cols) !== this.position[0]) {
      this.itemBackup[2] = this.gridsterItem.$item.cols;
      this.gridsterItem.$item.cols = this.position[0] - this.gridsterItem.$item.x;
      if (this.gridsterItem.$item.cols < 1 || this.gridsterItem.gridster.checkCollision(this.gridsterItem)) {
        this.gridsterItem.$item.cols = this.itemBackup[2];
        this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'width', this.gridsterItem.gridster.positionXToPixels(this.gridsterItem.$item.cols)
          - this.gridsterItem.gridster.$options.margin + 'px');
        return;
      } else {
        this.gridsterItem.gridster.previewStyle();
      }
    }
    this.gridsterItem.renderer.setStyle(this.gridsterItem.el, 'width', this.elemPosition[2] + 'px');
  }

  handleNW(e): void {
    this.handleN(e);
    this.handleW(e);
  }

  handleNE(e): void {
    this.handleN(e);
    this.handleE(e);
  }

  handleSW(e): void {
    this.handleS(e);
    this.handleW(e);
  }

  handleSE(e): void {
    this.handleS(e);
    this.handleE(e);
  }

  toggle(enabled): void {
    this.resizeEnabled = !this.gridsterItem.gridster.mobile &&
      (this.gridsterItem.$item.resizeEnabled === undefined ? enabled : this.gridsterItem.$item.resizeEnabled);
  }
}
