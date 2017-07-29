(function () {
  'use strict';

  angular.module('angular-gridster2').component('gridster', {
    templateUrl: 'gridster2/gridster.html',
    controller: GridsterController,
    controllerAs: 'GridsterCtrl',
    bindings: {
      options: '<'
    },
    transclude: true
  });

  /** @ngInject */
  function GridsterController($element, GridsterConfig, GridsterUtils, $log, $scope) {
    var vm = this;

    vm.calculateLayoutDebounce = angular.noop;
    vm.movingItem = undefined;
    vm.previewStyle = angular.noop;
    vm.mobile = false;
    vm.columns = 0;
    vm.rows = 0;
    vm.windowResize = angular.noop;
    vm.gridLines = undefined;

    vm.el = $element[0];
    vm.$options = JSON.parse(JSON.stringify(GridsterConfig));
    vm.mobile = false;
    vm.curWidth = 0;
    vm.curHeight = 0;
    vm.grid = [];
    vm.curColWidth = 0;
    vm.curRowHeight = 0;
    vm.$options.draggable.stop = undefined;
    vm.$options.draggable.start = undefined;
    vm.$options.resizable.stop = undefined;
    vm.$options.resizable.start = undefined;
    vm.$options.itemChangeCallback = undefined;
    vm.$options.itemResizeCallback = undefined;
    vm.$options.itemInitCallback = undefined;
    vm.$options.emptyCellClickCallback = undefined;
    vm.$options.emptyCellDropCallback = undefined;

    vm.checkCollisionTwoItems = function checkCollisionTwoItems(item, item2) {
      return item.x < item2.x + item2.cols
        && item.x + item.cols > item2.x
        && item.y < item2.y + item2.rows
        && item.y + item.rows > item2.y;
    };

    vm.$onInit = function () {
      vm.setOptions();
      vm.options.api = {
        optionsChanged: vm.optionsChanged.bind(vm),
        resize: vm.resize.bind(vm),
        getNextPossiblePosition: vm.getNextPossiblePosition.bind(vm)
      };
      vm.columns = vm.$options.minCols;
      vm.rows = vm.$options.minRows;
      vm.setGridSize();
      vm.calculateLayoutDebounce = GridsterUtils.debounce(vm.calculateLayout.bind(vm), 5);
      vm.calculateLayoutDebounce();
      if (vm.options.initCallback) {
        vm.options.initCallback(vm);
      }
    };

    vm.resize = function resize() {
      var height;
      var width;
      if (vm.$options.gridType === 'fit' && !vm.mobile) {
        width = vm.el.offsetWidth;
        height = vm.el.offsetHeight;
      } else {
        width = vm.el.clientWidth;
        height = vm.el.clientHeight;
      }
      if ((width !== vm.curWidth || height !== vm.curHeight) && vm.checkIfToResize()) {
        vm.onResize();
      }
    };

    vm.setOptions = function setOptions() {
      vm.$options = GridsterUtils.merge(vm.$options, vm.options, vm.$options);
      if (!vm.$options.disableWindowResize && !vm.onResizeFunction) {
        vm.onResizeFunction = vm.onResize.bind(vm);
        window.addEventListener('resize', vm.onResizeFunction);
      } else if (vm.$options.disableWindowResize && vm.onResizeFunction) {
        window.removeEventListener('resize', vm.onResizeFunction);
        vm.onResizeFunction = null;
      }
      if (vm.$options.enableEmptyCellClickDrag && !vm.emptyCellClick && vm.$options.emptyCellClickCallback) {
        vm.emptyCellClick = this.emptyCellClickCb.bind(this);
        vm.el.addEventListener('click', vm.emptyCellClick);
      } else if (!vm.$options.enableEmptyCellClickDrag && vm.emptyCellClick) {
        vm.el.removeEventListener('click', vm.emptyCellClick);
        vm.emptyCellClick = null;
      }
      if (vm.$options.enableEmptyCellClickDrag && !vm.emptyCellDrop && vm.$options.emptyCellDropCallback) {
        vm.emptyCellDrop = vm.emptyCellDragDrop.bind(vm);
        vm.emptyCellMove = vm.emptyCellDragOver.bind(vm);
        vm.el.addEventListener('drop', vm.emptyCellDrop);
        vm.el.addEventListener('dragover', vm.emptyCellMove);
      } else if (!vm.$options.enableEmptyCellClickDrag && vm.emptyCellDrop) {
        vm.el.removeEventListener('drop', vm.emptyCellDrop);
        vm.el.removeEventListener('dragover', vm.emptyCellMove);
        vm.emptyCellMove = null;
        vm.emptyCellDrop = null;
      }
    };

    vm.optionsChanged = function optionsChanged() {
      vm.setOptions();
      var widgetsIndex = vm.grid.length - 1, widget;
      for (; widgetsIndex >= 0; widgetsIndex--) {
        widget = vm.grid[widgetsIndex];
        widget.updateOptions();
      }
      vm.calculateLayout();
    };

    vm.$onDestroy = function () {
      if (vm.onResizeFunction) {
        window.removeEventListener('resize', vm.onResizeFunction);
      }
    };

    vm.emptyCellClickCb = function (e) {
      var item = vm.getValidItemFromEvent(e);
      if (!item || vm.movingItem) {
        return;
      }
      vm.$options.emptyCellClickCallback(event, item);
    };

    vm.emptyCellDragDrop = function (e) {
      var item = vm.getValidItemFromEvent(e);
      if (!item) {
        return;
      }
      vm.$options.emptyCellDropCallback(event, item);
    };

    vm.emptyCellDragOver = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (vm.getValidItemFromEvent(e)) {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    };

    vm.getValidItemFromEvent = function (e) {
      e.preventDefault();
      e.stopPropagation();
      GridsterUtils.checkTouchEvent(e);
      var x = e.pageX - vm.el.scrollLeft - vm.el.offsetLeft;
      var y = e.pageY - vm.el.scrollTop - vm.el.offsetTop;
      var item = {
        x: vm.pixelsToPositionX(x, Math.floor),
        y: vm.pixelsToPositionY(y, Math.floor),
        cols: vm.$options.defaultItemCols,
        rows: vm.$options.defaultItemRows
      };
      if (vm.checkCollision(item)) {
        return;
      }
      return item;
    };

    vm.onResize = function onResize() {
      vm.setGridSize();
      vm.calculateLayoutDebounce();
    };

    vm.checkIfToResize = function checkIfToResize() {
      var clientWidth = vm.el.clientWidth;
      var offsetWidth = vm.el.offsetWidth;
      var scrollWidth = vm.el.scrollWidth;
      var clientHeight = vm.el.clientHeight;
      var offsetHeight = vm.el.offsetHeight;
      var scrollHeight = vm.el.scrollHeight;
      var verticalScrollPresent = clientWidth < offsetWidth && scrollHeight > offsetHeight
        && scrollHeight - offsetHeight < offsetWidth - clientWidth;
      var horizontalScrollPresent = clientHeight < offsetHeight
        && scrollWidth > offsetWidth && scrollWidth - offsetWidth < offsetHeight - clientHeight;
      if (verticalScrollPresent) {
        return false;
      }
      return !horizontalScrollPresent;
    };

    vm.setGridSize = function setGridSize() {
      var width = vm.el.clientWidth;
      var height = vm.el.clientHeight;
      if (vm.$options.gridType === 'fit' && !vm.mobile) {
        width = vm.el.offsetWidth;
        height = vm.el.offsetHeight;
      } else {
        width = vm.el.clientWidth;
        height = vm.el.clientHeight;
      }
      vm.curWidth = width;
      vm.curHeight = height;
    };

    vm.setGridDimensions = function setGridDimensions() {
      var rows = vm.$options.minRows, columns = vm.$options.minCols;

      var widgetsIndex = vm.grid.length - 1;
      for (; widgetsIndex >= 0; widgetsIndex--) {
        rows = Math.max(rows, vm.grid[widgetsIndex].$item.y + vm.grid[widgetsIndex].$item.rows);
        columns = Math.max(columns, vm.grid[widgetsIndex].$item.x + vm.grid[widgetsIndex].$item.cols);
      }

      vm.columns = columns;
      vm.rows = rows;
    };

    vm.calculateLayout = function calculateLayout() {
      // check to compact
      vm.checkCompact();

      vm.setGridDimensions();
      if (vm.$options.outerMargin) {
        vm.curColWidth = Math.floor((vm.curWidth - vm.$options.margin) / vm.columns);
        vm.curRowHeight = Math.floor((vm.curHeight - vm.$options.margin) / vm.rows);
      } else {
        vm.curColWidth = Math.floor((vm.curWidth + vm.$options.margin) / vm.columns);
        vm.curRowHeight = Math.floor((vm.curHeight + vm.$options.margin) / vm.rows);
      }
      var addClass;
      var removeClass1;
      var removeClass2;
      var removeClass3;
      if (vm.$options.gridType === 'fit') {
        addClass = 'fit';
        removeClass1 = 'scrollVertical';
        removeClass2 = 'scrollHorizontal';
        removeClass3 = 'fixed';
      } else if (vm.$options.gridType === 'scrollVertical') {
        vm.curRowHeight = vm.curColWidth;
        addClass = 'scrollVertical';
        removeClass1 = 'fit';
        removeClass2 = 'scrollHorizontal';
        removeClass3 = 'fixed';
      } else if (vm.$options.gridType === 'scrollHorizontal') {
        vm.curColWidth = vm.curRowHeight;
        addClass = 'scrollHorizontal';
        removeClass1 = 'fit';
        removeClass2 = 'scrollVertical';
        removeClass3 = 'fixed';
      } else if (vm.$options.gridType === 'fixed') {
        vm.curColWidth = vm.$options.fixedColWidth;
        vm.curRowHeight = vm.$options.fixedRowHeight;
        addClass = 'fixed';
        removeClass1 = 'fit';
        removeClass2 = 'scrollVertical';
        removeClass3 = 'scrollHorizontal';
      } else if (vm.$options.gridType === 'verticalFixed') {
        vm.curRowHeight = vm.$options.fixedRowHeight;
        addClass = 'scrollVertical';
        removeClass1 = 'fit';
        removeClass2 = 'scrollHorizontal';
        removeClass3 = 'fixed';
      } else if (vm.$options.gridType === 'horizontalFixed') {
        vm.curColWidth = vm.$options.fixedColWidth;
        addClass = 'scrollHorizontal';
        removeClass1 = 'fit';
        removeClass2 = 'scrollVertical';
        removeClass3 = 'fixed';
      }
      $element.addClass(addClass);
      $element.removeClass(removeClass1);
      $element.removeClass(removeClass2);
      $element.removeClass(removeClass3);

      if (!vm.mobile && vm.$options.mobileBreakpoint > vm.curWidth) {
        vm.mobile = !vm.mobile;
        $element.addClass('mobile');
      } else if (vm.mobile && vm.$options.mobileBreakpoint < vm.curWidth) {
        vm.mobile = !vm.mobile;
        $element.removeClass('mobile');
      }
      if (vm.gridLines) {
        vm.gridLines.updateGrid(!!vm.movingItem);
      }

      var widgetsIndex = vm.grid.length - 1, widget;
      for (; widgetsIndex >= 0; widgetsIndex--) {
        widget = vm.grid[widgetsIndex];
        widget.setSize(false);
        widget.drag.toggle();
        widget.resize.toggle();
      }
      $scope.$applyAsync();
      setTimeout(vm.resize.bind(vm), 100);
    };

    vm.addItem = function addItem(itemComponent) {
      if (itemComponent.$item.cols === undefined) {
        itemComponent.$item.cols = vm.$options.defaultItemCols;
        itemComponent.item.cols = itemComponent.$item.cols;
        itemComponent.itemChanged();
      }
      if (itemComponent.$item.rows === undefined) {
        itemComponent.$item.rows = vm.$options.defaultItemRows;
        itemComponent.item.rows = itemComponent.$item.rows;
        itemComponent.itemChanged();
      }
      if (itemComponent.$item.x === undefined || itemComponent.$item.y === undefined) {
        vm.autoPositionItem(itemComponent);
      } else if (vm.checkCollision(itemComponent.$item)) {
        $log.warn('Can\'t be placed in the bounds of the dashboard, trying to auto position!/n' +
          JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
        itemComponent.$item.x = undefined;
        itemComponent.$item.y = undefined;
        vm.autoPositionItem(itemComponent);
      }
      vm.grid.push(itemComponent);
      vm.calculateLayoutDebounce();
      if (itemComponent.$item.initCallback) {
        itemComponent.$item.initCallback(itemComponent.item, itemComponent);
      }
      if (vm.$options.itemInitCallback) {
        vm.$options.itemInitCallback(itemComponent.item, itemComponent);
      }
    };

    vm.removeItem = function removeItem(itemComponent) {
      vm.grid.splice(vm.grid.indexOf(itemComponent), 1);
      vm.calculateLayoutDebounce();
    };

    vm.checkCollision = function checkCollision(itemComponent, ignoreItem) {
      if (vm.checkGridCollision(itemComponent)) {
        return true;
      }
      return vm.findItemWithItem(itemComponent, ignoreItem);
    };

    vm.checkGridCollision = function checkGridCollision(itemComponent) {
      var noNegativePosition = itemComponent.y > -1 && itemComponent.x > -1;
      var maxGridCols = itemComponent.cols + itemComponent.x <= vm.$options.maxCols;
      var maxGridRows = itemComponent.rows + itemComponent.y <= vm.$options.maxRows;
      var maxItemCols = itemComponent.maxItemCols === undefined ? vm.$options.maxItemCols : itemComponent.maxItemCols;
      var minItemCols = itemComponent.minItemCols === undefined ? vm.$options.minItemCols : itemComponent.minItemCols;
      var maxItemRows = itemComponent.maxItemRows === undefined ? vm.$options.maxItemRows : itemComponent.maxItemRows;
      var minItemRows = itemComponent.minItemRows === undefined ? vm.$options.minItemRows : itemComponent.minItemRows;
      var inColsLimits = itemComponent.cols <= maxItemCols && itemComponent.cols >= minItemCols;
      var inRowsLimits = itemComponent.rows <= maxItemRows && itemComponent.rows >= minItemRows;
      return !(noNegativePosition && maxGridCols && maxGridRows && inColsLimits && inRowsLimits);
    };

    vm.findItemWithItem = function findItemWithItem(itemComponent, ignoreItem) {
      var widgetsIndex = vm.grid.length - 1, widget;
      for (; widgetsIndex >= 0; widgetsIndex--) {
        widget = vm.grid[widgetsIndex];
        if (widget.$item !== itemComponent && widget.$item !== ignoreItem
          && vm.checkCollisionTwoItems(widget.$item, itemComponent)) {
          return widget;
        }
      }
    };

    vm.autoPositionItem = function autoPositionItem(itemComponent) {
      if (vm.getNextPossiblePosition(itemComponent.$item)) {
        itemComponent.item.x = itemComponent.$item.x;
        itemComponent.item.y = itemComponent.$item.y;
        itemComponent.itemChanged();
      } else {
        itemComponent.notPlaced = true;
        $log.warn('Can\'t be placed in the bounds of the dashboard!/n' +
          JSON.stringify(itemComponent.item, ['cols', 'rows', 'x', 'y']));
      }
    };

    vm.getNextPossiblePosition = function getNextPossiblePosition(newItem) {
      if (newItem.cols === undefined) {
        newItem.cols = vm.$options.defaultItemCols;
      }
      if (newItem.rows === undefined) {
        newItem.rows = vm.$options.defaultItemRows;
      }
      vm.setGridDimensions();
      var rowsIndex = 0, colsIndex;
      for (; rowsIndex < vm.rows; rowsIndex++) {
        newItem.y = rowsIndex;
        colsIndex = 0;
        for (; colsIndex < vm.columns; colsIndex++) {
          newItem.x = colsIndex;
          if (!vm.checkCollision(newItem)) {
            return true;
          }
        }
      }
      var canAddToRows = vm.$options.maxRows > vm.rows + newItem.rows;
      var canAddToColumns = vm.$options.maxCols > vm.columns + newItem.cols;
      var addToRows = vm.rows <= vm.columns && canAddToRows;
      if (!addToRows && canAddToColumns) {
        newItem.x = vm.columns;
        newItem.y = 0;
        return true;
      } else if (canAddToRows) {
        newItem.y = vm.rows;
        newItem.x = 0;
        return true;
      }
    };

    vm.pixelsToPosition = function pixelsToPosition(x, y, roundingMethod) {
      return [vm.pixelsToPositionX(x, roundingMethod), vm.pixelsToPositionY(y, roundingMethod)];
    };

    vm.pixelsToPositionX = function pixelsToPositionX(x, roundingMethod) {
      return roundingMethod(x / vm.curColWidth);
    };

    vm.pixelsToPositionY = function pixelsToPositionY(y, roundingMethod) {
      return roundingMethod(y / vm.curRowHeight);
    };

    vm.positionXToPixels = function positionXToPixels(x) {
      return x * vm.curColWidth;
    };

    vm.positionYToPixels = function positionYToPixels(y) {
      return y * vm.curRowHeight;
    };

    vm.checkCompact = function checkCompact() {
      if (vm.$options.compactType !== 'none') {
        if (vm.$options.compactType === 'compactUp') {
          vm.checkCompactUp();
        } else if (vm.$options.compactType === 'compactLeft') {
          vm.checkCompactLeft();
        } else if (vm.$options.compactType === 'compactUp&Left') {
          vm.checkCompactUp();
          vm.checkCompactLeft();
        } else if (vm.$options.compactType === 'compactLeft&Up') {
          vm.checkCompactLeft();
          vm.checkCompactUp();
        }
      }
    };

    vm.checkCompactUp = function checkCompactUp() {
      var widgetMovedUp = false, widget, moved;
      var l = vm.grid.length;
      for (var i = 0; i < l; i++) {
        widget = vm.grid[i];
        moved = vm.moveUpTillCollision(widget);
        if (moved) {
          widgetMovedUp = true;
          widget.item.y = widget.$item.y;
          widget.itemChanged();
        }
      }
      if (widgetMovedUp) {
        vm.checkCompactUp();
        return widgetMovedUp;
      }
    };

    vm.moveUpTillCollision = function moveUpTillCollision(itemComponent) {
      itemComponent.$item.y -= 1;
      if (vm.checkCollision(itemComponent.$item)) {
        itemComponent.$item.y += 1;
        return false;
      } else {
        vm.moveUpTillCollision(itemComponent);
        return true;
      }
    };

    vm.checkCompactLeft = function checkCompactLeft() {
      var widgetMovedUp = false, widget, moved;
      var l = vm.grid.length;
      for (var i = 0; i < l; i++) {
        widget = vm.grid[i];
        moved = vm.moveLeftTillCollision(widget);
        if (moved) {
          widgetMovedUp = true;
          widget.item.x = widget.$item.x;
          widget.itemChanged();
        }
      }
      if (widgetMovedUp) {
        vm.checkCompactLeft();
        return widgetMovedUp;
      }
    };

    vm.moveLeftTillCollision = function moveLeftTillCollision(itemComponent) {
      itemComponent.$item.x -= 1;
      if (vm.checkCollision(itemComponent.$item)) {
        itemComponent.$item.x += 1;
        return false;
      } else {
        vm.moveUpTillCollision(itemComponent);
        return true;
      }
    }
  }
})();
