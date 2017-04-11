import {Component, OnInit, ElementRef, Input, Host, OnDestroy, Output, EventEmitter, Renderer2} from '@angular/core';
import {GridsterItem} from './gridsterItem.interface';
import {GridsterComponent} from './gridster.component';
import {GridsterDraggable} from './gridsterDraggable.service';
import {GridsterResizable} from './gridsterResizable.service';
import {GridsterUtils} from './gridsterUtils.service';

@Component({
  selector: 'gridster-item',
  templateUrl: './gridsterItem.html',
  styleUrls: ['./gridsterItem.css']
})
export class GridsterItemComponent implements OnInit, OnDestroy {
  @Input() item: GridsterItem;
  @Output() itemChange: EventEmitter<GridsterItem> = new EventEmitter();
  @Output() itemResize: EventEmitter<GridsterItem> = new EventEmitter();
  state: {
    item: GridsterItem
  };
  el: any;
  gridster: GridsterComponent;
  itemTop: number;
  itemLeft: number;
  itemWidth: number;
  itemHeight: number;
  top: number;
  left: number;
  width: number;
  height: number;
  itemMargin: number;


  constructor(el: ElementRef, @Host() gridster: GridsterComponent, public renderer: Renderer2) {
    this.el = el.nativeElement;
    this.state = {
      item: {
        cols: undefined,
        rows: undefined,
        x: undefined,
        y: undefined,
        initCallback: undefined,
        dragEnabled: undefined,
        resizeEnabled: undefined,
        setSize: this.setSize.bind(this),
        itemChanged: this.itemChanged.bind(this),
        checkItemChanges: this.checkItemChanges.bind(this),
        drag: new GridsterDraggable(this),
        resize: new GridsterResizable(this)
      }
    };

    this.gridster = gridster;
  }

  ngOnInit() {
    this.state.item = GridsterUtils.merge(this.state.item, this.item, this.state.item);
    this.gridster.addItem(this.state.item);
  }

  ngOnDestroy() {
    this.gridster.removeItem(this.state.item);
  }

  setSize(noCheck: Boolean) {
    if (this.gridster.state.mobile) {
      this.top = 0;
      this.left = 0;
      this.width = this.gridster.state.curWidth - (this.gridster.state.options.outerMargin ? 2 * this.gridster.state.options.margin : 0);
      this.height = this.width / 2;
    } else {
      this.top = this.state.item.y * this.gridster.state.curRowHeight;
      this.left = this.state.item.x * this.gridster.state.curColWidth;
      this.width = this.state.item.cols * this.gridster.state.curColWidth - this.gridster.state.options.margin;
      this.height = this.state.item.rows * this.gridster.state.curRowHeight - this.gridster.state.options.margin;
    }
    if (!noCheck && this.top === this.itemTop && this.left === this.itemLeft &&
      this.width === this.itemWidth && this.height === this.itemHeight) {
      return;
    }
    if (this.gridster.state.options.outerMargin) {
      this.itemMargin = this.gridster.state.options.margin;
    } else {
      this.itemMargin = 0;
    }

    this.renderer.setStyle(this.el, 'display', 'block');
    this.renderer.setStyle(this.el, 'top', this.top + 'px');
    this.renderer.setStyle(this.el, 'left', this.left + 'px');
    this.renderer.setStyle(this.el, 'width', this.width + 'px');
    this.renderer.setStyle(this.el, 'height', this.height + 'px');
    this.renderer.setStyle(this.el, 'margin', this.itemMargin + 'px');
    if (this.width !== this.itemWidth || this.height !== this.itemHeight) {
      this.itemResize.emit(this.state.item);
      if (this.gridster.state.options.itemResizeCallback) {
        this.gridster.state.options.itemResizeCallback(this.state.item, this);
      }
    }
    this.itemTop = this.top;
    this.itemLeft = this.left;
    this.itemWidth = this.width;
    this.itemHeight = this.height;
  }

  itemChanged() {
    this.itemChange.emit(this.state.item);
    if (this.gridster.state.options.itemChangeCallback) {
      this.gridster.state.options.itemChangeCallback(this.state.item, this);
    }
  }

  checkItemChanges(newValue, oldValue) {
    if (newValue.rows === oldValue.rows && newValue.cols === oldValue.cols && newValue.x === oldValue.x && newValue.y === oldValue.y) {
      return;
    }
    if (this.gridster.checkCollision(this.state.item)) {
      this.state.item.x = oldValue.x;
      this.state.item.y = oldValue.y;
      this.state.item.cols = oldValue.cols;
      this.state.item.rows = oldValue.rows;
    } else {
      this.item.cols = this.state.item.cols;
      this.item.rows = this.state.item.rows;
      this.item.x = this.state.item.x;
      this.item.y = this.state.item.y;
      this.gridster.calculateLayout();
      this.itemChanged();
    }
  }

}
