import {Component, OnInit, ElementRef, Input, OnDestroy, Renderer2, ChangeDetectorRef} from '@angular/core';
import {GridsterConfigService} from './gridsterConfig.constant';
import {GridsterConfig} from './gridsterConfig.interface';
import {GridsterUtils} from './gridsterUtils.service';
import {GridsterItemComponent} from './gridsterItem.component';
import {GridsterGridComponent} from './gridsterGrid.component';
import {GridsterItem} from './gridsterItem.interface';
import {GridsterEmptyCell} from './gridsterEmptyCell.service';
import {GridsterCompact} from './gridsterCompact.service';

@Component({
  selector: 'gridster',
  templateUrl: './gridster.html',
  styleUrls: ['./gridster.css']
})
export class GridsterComponent implements OnInit, OnDestroy {
  @Input() options: GridsterConfig;
  calculateLayoutDebounce: Function;
  movingItem: GridsterItem;
  previewStyle: Function;
  el: any;
  $options: GridsterConfig;
  mobile: boolean;
  curWidth: number;
  curHeight: number;
  grid: Array<GridsterItemComponent>;
  columns: number;
  rows: number;
  curColWidth: number;
  curRowHeight: number;
  windowResize: Function;
  gridLines: GridsterGridComponent;
  dragInProgress: boolean;
  emptyCell: GridsterEmptyCell;
  compact: GridsterCompact;

  static checkCollisionTwoItems(item: GridsterItem, item2: GridsterItem): boolean {
    return item.x < item2.x + item2.cols
      && item.x + item.cols > item2.x
      && item.y < item2.y + item2.rows
      && item.y + item.rows > item2.y;
  }

  constructor(el: ElementRef, public renderer: Renderer2, public cdRef: ChangeDetectorRef) {
    this.el = el.nativeElement;
    this.$options = JSON.parse(JSON.stringify(GridsterConfigService));
    this.mobile = false;
    this.curWidth = 0;
    this.curHeight = 0;
    this.grid = [];
    this.curColWidth = 0;
    this.curRowHeight = 0;
    this.dragInProgress = false;
    this.$options.draggable.stop = undefined;
    this.$options.draggable.start = undefined;
    this.$options.resizable.stop = undefined;
    this.$options.resizable.start = undefined;
    this.$options.itemChangeCallback = undefined;
    this.$options.itemResizeCallback = undefined;
    this.$options.itemInitCallback = undefined;
    this.$options.emptyCellClickCallback = undefined;
    this.$options.emptyCellDropCallback = undefined;
    this.$options.emptyCellDragCallback = undefined;
    this.emptyCell = new GridsterEmptyCell(this);
    this.compact = new GridsterCompact(this);
  }

  ngOnInit(): void {
    this.setOptions();
    this.options.api = {
      optionsChanged: this.optionsChanged.bind(this),
      resize: this.resize.bind(this),
      getNextPossiblePosition: this.getNextPossiblePosition.bind(this)
    };
    this.columns = this.$options.minCols;
    this.rows = this.$options.minRows;
    this.setGridSize();
    this.calculateLayoutDebounce = GridsterUtils.debounce(this.calculateLayout.bind(this), 5);
    this.calculateLayoutDebounce();
    if (this.options.initCallback) {
      this.options.initCallback(this);
    }
  }

  resize(): void {
    let height;
    let width;
    if (this.$options.gridType === 'fit' && !this.mobile) {
      width = this.el.offsetWidth;
      height = this.el.offsetHeight;
    } else {
      width = this.el.clientWidth;
      height = this.el.clientHeight;
    }
    if ((width !== this.curWidth || height !== this.curHeight) && this.checkIfToResize()) {
      this.onResize();
    }
  }

  setOptions(): void {
    this.$options = GridsterUtils.merge(this.$options, this.options, this.$options);
    if (!this.$options.disableWindowResize && !this.windowResize) {
      this.windowResize = this.renderer.listen('window', 'resize', this.onResize.bind(this));
    } else if (this.$options.disableWindowResize && this.windowResize) {
      this.windowResize();
      this.windowResize = null;
    }
    this.emptyCell.updateOptions();
  }

  optionsChanged(): void {
    this.setOptions();
    let widgetsIndex: number = this.grid.length - 1, widget: GridsterItemComponent;
    for (; widgetsIndex >= 0; widgetsIndex--) {
      widget = this.grid[widgetsIndex];
      widget.updateOptions();
    }
    this.calculateLayout();
  }

  ngOnDestroy(): void {
    if (this.windowResize) {
      this.windowResize();
    }
  }

  onResize(): void {
    this.setGridSize();
    this.calculateLayoutDebounce();
  }

  checkIfToResize(): boolean {
    const clientWidth = this.el.clientWidth;
    const offsetWidth = this.el.offsetWidth;
    const scrollWidth = this.el.scrollWidth;
    const clientHeight = this.el.clientHeight;
    const offsetHeight = this.el.offsetHeight;
    const scrollHeight = this.el.scrollHeight;
    const verticalScrollPresent = clientWidth < offsetWidth && scrollHeight > offsetHeight
      && scrollHeight - offsetHeight < offsetWidth - clientWidth;
    const horizontalScrollPresent = clientHeight < offsetHeight
      && scrollWidth > offsetWidth && scrollWidth - offsetWidth < offsetHeight - clientHeight;
    if (verticalScrollPresent) {
      return false;
    }
    return !horizontalScrollPresent;
  }

  setGridSize(): void {
    let width = this.el.clientWidth;
    let height = this.el.clientHeight;
    if (this.$options.gridType === 'fit' && !this.mobile) {
      width = this.el.offsetWidth;
      height = this.el.offsetHeight;
    } else {
      width = this.el.clientWidth;
      height = this.el.clientHeight;
    }
    this.curWidth = width;
    this.curHeight = height;
  }

  setGridDimensions(): void {
    let rows = this.$options.minRows, columns = this.$options.minCols;

    let widgetsIndex = this.grid.length - 1;
    for (; widgetsIndex >= 0; widgetsIndex--) {
      rows = Math.max(rows, this.grid[widgetsIndex].$item.y + this.grid[widgetsIndex].$item.rows);
      columns = Math.max(columns, this.grid[widgetsIndex].$item.x + this.grid[widgetsIndex].$item.cols);
    }

    this.columns = columns;
    this.rows = rows;
  }

  calculateLayout(): void {
    // check to compact
    this.compact.checkCompact();

    this.setGridDimensions();
    if (this.$options.outerMargin) {
      this.curColWidth = Math.floor((this.curWidth - this.$options.margin) / this.columns);
      this.curRowHeight = Math.floor((this.curHeight - this.$options.margin) / this.rows);
    } else {
      this.curColWidth = Math.floor((this.curWidth + this.$options.margin) / this.columns);
      this.curRowHeight = Math.floor((this.curHeight + this.$options.margin) / this.rows);
    }
    let addClass: string;
    let removeClass1: string;
    let removeClass2: string;
    let removeClass3: string;
    if (this.$options.gridType === 'fit') {
      addClass = 'fit';
      removeClass1 = 'scrollVertical';
      removeClass2 = 'scrollHorizontal';
      removeClass3 = 'fixed';
    } else if (this.$options.gridType === 'scrollVertical') {
      this.curRowHeight = this.curColWidth;
      addClass = 'scrollVertical';
      removeClass1 = 'fit';
      removeClass2 = 'scrollHorizontal';
      removeClass3 = 'fixed';
    } else if (this.$options.gridType === 'scrollHorizontal') {
      this.curColWidth = this.curRowHeight;
      addClass = 'scrollHorizontal';
      removeClass1 = 'fit';
      removeClass2 = 'scrollVertical';
      removeClass3 = 'fixed';
    } else if (this.$options.gridType === 'fixed') {
      this.curColWidth = this.$options.fixedColWidth;
      this.curRowHeight = this.$options.fixedRowHeight;
      addClass = 'fixed';
      removeClass1 = 'fit';
      removeClass2 = 'scrollVertical';
      removeClass3 = 'scrollHorizontal';
    } else if (this.$options.gridType === 'verticalFixed') {
      this.curRowHeight = this.$options.fixedRowHeight;
      addClass = 'scrollVertical';
      removeClass1 = 'fit';
      removeClass2 = 'scrollHorizontal';
      removeClass3 = 'fixed';
    } else if (this.$options.gridType === 'horizontalFixed') {
      this.curColWidth = this.$options.fixedColWidth;
      addClass = 'scrollHorizontal';
      removeClass1 = 'fit';
      removeClass2 = 'scrollVertical';
      removeClass3 = 'fixed';
    }

    this.renderer.addClass(this.el, addClass);
    this.renderer.removeClass(this.el, removeClass1);
    this.renderer.removeClass(this.el, removeClass2);
    this.renderer.removeClass(this.el, removeClass3);

    if (!this.mobile && this.$options.mobileBreakpoint > this.curWidth) {
      this.mobile = !this.mobile;
      this.renderer.addClass(this.el, 'mobile');
    } else if (this.mobile && this.$options.mobileBreakpoint < this.curWidth) {
      this.mobile = !this.mobile;
      this.renderer.removeClass(this.el, 'mobile');
    }
    this.gridLines.updateGrid();

    let widgetsIndex: number = this.grid.length - 1, widget: GridsterItemComponent;
    for (; widgetsIndex >= 0; widgetsIndex--) {
      widget = this.grid[widgetsIndex];
      widget.setSize(false);
      widget.drag.toggle();
      widget.resize.toggle();
    }

    setTimeout(this.resize.bind(this), 100);
  }

  addItem(itemComponent: GridsterItemComponent): void {
    if (itemComponent.$item.cols === undefined) {
      itemComponent.$item.cols = this.$options.defaultItemCols;
      itemComponent.item.cols = itemComponent.$item.cols;
      itemComponent.itemChanged();
    }
    if (itemComponent.$item.rows === undefined) {
      itemComponent.$item.rows = this.$options.defaultItemRows;
      itemComponent.item.rows = itemComponent.$item.rows;
      itemComponent.itemChanged();
    }
    if (itemComponent.$item.x === undefined || itemComponent.$item.y === undefined) {
      this.autoPositionItem(itemComponent);
    } else if (this.checkCollision(itemComponent.$item)) {
      console.warn('Can\'t be placed in the bounds of the dashboard, trying to auto position!/n' +
        JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
      itemComponent.$item.x = undefined;
      itemComponent.$item.y = undefined;
      this.autoPositionItem(itemComponent);
    }
    this.grid.push(itemComponent);
    this.calculateLayoutDebounce();
    if (itemComponent.$item.initCallback) {
      itemComponent.$item.initCallback(itemComponent.item, itemComponent);
    }
    if (this.$options.itemInitCallback) {
      this.$options.itemInitCallback(itemComponent.item, itemComponent);
    }
  }

  removeItem(itemComponent: GridsterItemComponent): void {
    this.grid.splice(this.grid.indexOf(itemComponent), 1);
    this.calculateLayoutDebounce();
  }

  checkCollision(itemComponent: GridsterItem): GridsterItemComponent | boolean {
    if (this.checkGridCollision(itemComponent)) {
      return true;
    }
    return this.findItemWithItem(itemComponent);
  }

  checkGridCollision(itemComponent: GridsterItem): boolean {
    const noNegativePosition = itemComponent.y > -1 && itemComponent.x > -1;
    const maxGridCols = itemComponent.cols + itemComponent.x <= this.$options.maxCols;
    const maxGridRows = itemComponent.rows + itemComponent.y <= this.$options.maxRows;
    const maxItemCols = itemComponent.maxItemCols === undefined ? this.$options.maxItemCols : itemComponent.maxItemCols;
    const minItemCols = itemComponent.minItemCols === undefined ? this.$options.minItemCols : itemComponent.minItemCols;
    const maxItemRows = itemComponent.maxItemRows === undefined ? this.$options.maxItemRows : itemComponent.maxItemRows;
    const minItemRows = itemComponent.minItemRows === undefined ? this.$options.minItemRows : itemComponent.minItemRows;
    const inColsLimits = itemComponent.cols <= maxItemCols && itemComponent.cols >= minItemCols;
    const inRowsLimits = itemComponent.rows <= maxItemRows && itemComponent.rows >= minItemRows;
    const minAreaLimit = itemComponent.minItemArea === undefined ? this.$options.minItemArea : itemComponent.minItemArea;
    const maxAreaLimit = itemComponent.maxItemArea === undefined ? this.$options.maxItemArea : itemComponent.maxItemArea;
    const area = itemComponent.cols * itemComponent.rows;
    const inMinArea = minAreaLimit <= area;
    const inMaxArea = maxAreaLimit >= area;
    return !(noNegativePosition && maxGridCols && maxGridRows && inColsLimits && inRowsLimits && inMinArea && inMaxArea);
  }

  findItemWithItem(itemComponent: GridsterItem): GridsterItemComponent {
    let widgetsIndex: number = this.grid.length - 1, widget: GridsterItemComponent;
    for (; widgetsIndex >= 0; widgetsIndex--) {
      widget = this.grid[widgetsIndex];
      if (widget.$item !== itemComponent && GridsterComponent.checkCollisionTwoItems(widget.$item, itemComponent)) {
        return widget;
      }
    }
  }

  autoPositionItem(itemComponent: GridsterItemComponent): void {
    if (this.getNextPossiblePosition(itemComponent.$item)) {
      itemComponent.item.x = itemComponent.$item.x;
      itemComponent.item.y = itemComponent.$item.y;
      itemComponent.itemChanged();
    } else {
      itemComponent.notPlaced = true;
      console.warn('Can\'t be placed in the bounds of the dashboard!/n' +
        JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
    }
  }

  getNextPossiblePosition(newItem: GridsterItem): boolean {
    if (newItem.cols === undefined) {
      newItem.cols = this.$options.defaultItemCols;
    }
    if (newItem.rows === undefined) {
      newItem.rows = this.$options.defaultItemRows;
    }
    this.setGridDimensions();
    let rowsIndex = 0, colsIndex;
    for (; rowsIndex < this.rows; rowsIndex++) {
      newItem.y = rowsIndex;
      colsIndex = 0;
      for (; colsIndex < this.columns; colsIndex++) {
        newItem.x = colsIndex;
        if (!this.checkCollision(newItem)) {
          return true;
        }
      }
    }
    const canAddToRows = this.$options.maxRows > this.rows + newItem.rows;
    const canAddToColumns = this.$options.maxCols > this.columns + newItem.cols;
    const addToRows = this.rows <= this.columns && canAddToRows;
    if (!addToRows && canAddToColumns) {
      newItem.x = this.columns;
      newItem.y = 0;
      return true;
    } else if (canAddToRows) {
      newItem.y = this.rows;
      newItem.x = 0;
      return true;
    }
  }

  pixelsToPosition(x: number, y: number, roundingMethod: Function): [number, number] {
    return [this.pixelsToPositionX(x, roundingMethod), this.pixelsToPositionY(y, roundingMethod)];
  }

  pixelsToPositionX(x: number, roundingMethod: Function): number {
    return roundingMethod(x / this.curColWidth);
  }

  pixelsToPositionY(y: number, roundingMethod: Function): number {
    return roundingMethod(y / this.curRowHeight);
  }

  positionXToPixels(x: number): number {
    return x * this.curColWidth;
  }

  positionYToPixels(y: number): number {
    return y * this.curRowHeight;
  }
}
