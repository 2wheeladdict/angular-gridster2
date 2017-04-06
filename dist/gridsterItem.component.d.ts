import { OnInit, ElementRef, OnDestroy, EventEmitter, Renderer2 } from '@angular/core';
import { GridsterItem } from './gridsterItem.interface';
import { GridsterComponent } from './gridster.component';
export declare class GridsterItemComponent implements OnInit, OnDestroy {
    renderer: Renderer2;
    item: GridsterItem;
    itemChange: EventEmitter<GridsterItem>;
    itemResize: EventEmitter<GridsterItem>;
    state: {
        item: GridsterItem;
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
    constructor(el: ElementRef, gridster: GridsterComponent, renderer: Renderer2);
    ngOnInit(): void;
    ngOnDestroy(): void;
    setSize(noCheck: Boolean): void;
    itemChanged(): void;
    checkItemChanges(newValue: any, oldValue: any): void;
}
