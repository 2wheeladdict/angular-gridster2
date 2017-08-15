(function () {
  'use strict';

  angular.module('angular-gridster2')
    .service('GridsterPush', GridsterPush);

  /** @ngInject */
  function GridsterPush() {
    return function (gridsterItem, gridster) {
      var vm = this;

      vm.pushedItems = [];
      vm.pushedItemsPath = [];
      vm.gridsterItem = gridsterItem;
      vm.gridster = gridster;
      vm.fromSouth = 'fromSouth';
      vm.fromNorth = 'fromNorth';
      vm.fromEast = 'fromEast';
      vm.fromWest = 'fromWest';

      vm.pushItems = function (direction) {
        if (vm.gridster.$options.pushItems) {
          vm.push(vm.gridsterItem, direction);
        }
      };

      vm.restoreItems = function () {
        var i = 0;
        var l = vm.pushedItems.length;
        var pushedItem;
        for (; i < l; i++) {
          pushedItem = vm.pushedItems[i];
          pushedItem.$item.x = pushedItem.item.x;
          pushedItem.$item.y = pushedItem.item.y;
          pushedItem.setSize(true);
        }
        vm.pushedItems = undefined;
        vm.pushedItemsPath = undefined;
      };

      vm.setPushedItems = function () {
        var i = 0;
        var l = vm.pushedItems.length;
        var pushedItem;
        for (; i < l; i++) {
          pushedItem = vm.pushedItems[i];
          pushedItem.checkItemChanges(pushedItem.$item, pushedItem.item);
        }
        vm.pushedItems = undefined;
        vm.pushedItemsPath = undefined;
      };

      vm.push = function (gridsterItem, direction) {
        var gridsterItemCollision = vm.gridster.checkCollision(gridsterItem.$item);
        if (gridsterItemCollision && gridsterItemCollision !== true &&
          gridsterItemCollision !== vm.gridsterItem && gridsterItemCollision.canBeDragged()) {
          var gridsterItemCollide = gridsterItemCollision;
          if (vm.tryPattern[direction][0].call(this, gridsterItemCollide, gridsterItem, direction)) {
            return true;
          } else if (vm.tryPattern[direction][1].call(this, gridsterItemCollide, gridsterItem, direction)) {
            return true;
          } else if (vm.tryPattern[direction][2].call(this, gridsterItemCollide, gridsterItem, direction)) {
            return true;
          } else if (vm.tryPattern[direction][3].call(this, gridsterItemCollide, gridsterItem, direction)) {
            return true;
          }
        } else if (gridsterItemCollision === false) {
          return true;
        }
        return false;
      };

      vm.trySouth = function (gridsterItemCollide, gridsterItem, direction) {
        var backUpY = gridsterItemCollide.$item.y;
        gridsterItemCollide.$item.y = gridsterItem.$item.y + gridsterItem.$item.rows;
        if (!vm.gridster.checkCollisionTwoItems(gridsterItemCollide.$item, gridsterItem.$item)
          && vm.push(gridsterItemCollide, vm.fromNorth)) {
          gridsterItemCollide.setSize(true);
          vm.addToPushed(gridsterItemCollide);
          vm.push(gridsterItem, direction);
          return true;
        } else {
          gridsterItemCollide.$item.y = backUpY;
        }
        return false;
      };

      vm.tryNorth = function (gridsterItemCollide, gridsterItem, direction) {
        var backUpY = gridsterItemCollide.$item.y;
        gridsterItemCollide.$item.y = gridsterItem.$item.y - gridsterItemCollide.$item.rows;
        if (!vm.gridster.checkCollisionTwoItems(gridsterItemCollide.$item, gridsterItem.$item)
          && vm.push(gridsterItemCollide, vm.fromSouth)) {
          gridsterItemCollide.setSize(true);
          vm.addToPushed(gridsterItemCollide);
          vm.push(gridsterItem, direction);
          return true;
        } else {
          gridsterItemCollide.$item.y = backUpY;
        }
        return false;
      };

      vm.tryEast = function (gridsterItemCollide, gridsterItem, direction) {
        var backUpX = gridsterItemCollide.$item.x;
        gridsterItemCollide.$item.x = gridsterItem.$item.x + gridsterItem.$item.cols;
        if (!vm.gridster.checkCollisionTwoItems(gridsterItemCollide.$item, gridsterItem.$item)
          && vm.push(gridsterItemCollide, vm.fromWest)) {
          gridsterItemCollide.setSize(true);
          vm.addToPushed(gridsterItemCollide);
          vm.push(gridsterItem, direction);
          return true;
        } else {
          gridsterItemCollide.$item.x = backUpX;
        }
        return false;
      };

      vm.tryWest = function (gridsterItemCollide, gridsterItem, direction) {
        var backUpX = gridsterItemCollide.$item.x;
        gridsterItemCollide.$item.x = gridsterItem.$item.x - gridsterItemCollide.$item.cols;
        if (!vm.gridster.checkCollisionTwoItems(gridsterItemCollide.$item, gridsterItem.$item)
          && vm.push(gridsterItemCollide, vm.fromEast)) {
          gridsterItemCollide.setSize(true);
          vm.addToPushed(gridsterItemCollide);
          vm.push(gridsterItem, direction);
          return true;
        } else {
          gridsterItemCollide.$item.x = backUpX;
        }
        return false;
      };

      vm.tryPattern = {
        fromEast: [vm.tryWest, vm.trySouth, vm.tryNorth, vm.tryEast],
        fromWest: [vm.tryEast, vm.trySouth, vm.tryNorth, vm.tryWest],
        fromNorth: [vm.trySouth, vm.tryEast, vm.tryWest, vm.tryNorth],
        fromSouth: [vm.tryNorth, vm.tryEast, vm.tryWest, vm.trySouth]
      };

      vm.addToPushed = function (gridsterItem) {
        if (vm.pushedItems.indexOf(gridsterItem) < 0) {
          vm.pushedItems.push(gridsterItem);
          vm.pushedItemsPath.push([{x: gridsterItem.item.x, y: gridsterItem.item.y}, {
            x: gridsterItem.$item.x,
            y: gridsterItem.$item.y
          }]);
        } else {
          var i = vm.pushedItems.indexOf(gridsterItem);
          vm.pushedItemsPath[i].push({x: gridsterItem.$item.x, y: gridsterItem.$item.y});
        }
      };

      vm.removeFromPushed = function (i) {
        if (i > -1) {
          vm.pushedItems.splice(i, 1);
          vm.pushedItemsPath.splice(i, 1);
        }
      };

      vm.checkPushBack = function () {
        var i = vm.pushedItems.length - 1;
        var change = false;
        for (; i > -1; i--) {
          if (vm.checkPushedItem(vm.pushedItems[i], i)) {
            change = true;
          }
        }
        if (change) {
          vm.checkPushBack();
        }
      };

      vm.checkPushedItem = function (pushedItem, i) {
        var path = vm.pushedItemsPath[i];
        var j = path.length - 2;
        var lastPosition, x, y;
        for (; j > -1; j--) {
          lastPosition = path[j];
          x = pushedItem.$item.x;
          y = pushedItem.$item.y;
          pushedItem.$item.x = lastPosition.x;
          pushedItem.$item.y = lastPosition.y;
          if (!vm.gridster.findItemWithItem(pushedItem.$item)) {
            pushedItem.setSize(true);
            path.splice(j + 1, path.length - 1 - j);
          } else {
            pushedItem.$item.x = x;
            pushedItem.$item.y = y;
          }
        }
        if (path.length < 2) {
          vm.removeFromPushed(i);
          return true;
        }
        return false;
      };
    }
  }
})();
