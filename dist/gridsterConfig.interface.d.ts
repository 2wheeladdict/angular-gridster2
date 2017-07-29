export declare type GridType = 'fit' | 'scrollVertical' | 'scrollHorizontal' | 'fixed' | 'verticalFixed' | 'horizontalFixed';
export declare type displayGrid = 'always' | 'onDrag&Resize' | 'none';
export declare type compactType = 'none' | 'compactUp' | 'compactLeft' | 'compactUp&Left' | 'compactLeft&Up';
export interface GridsterConfig {
    gridType?: GridType;
    fixedColWidth?: number;
    fixedRowHeight?: number;
    keepFixedHeightInMobile?: boolean;
    compactType?: compactType;
    mobileBreakpoint?: number;
    minCols?: number;
    maxCols?: number;
    minRows?: number;
    maxRows?: number;
    defaultItemCols?: number;
    defaultItemRows?: number;
    maxItemCols?: number;
    maxItemRows?: number;
    minItemCols?: number;
    minItemRows?: number;
    margin?: number;
    outerMargin?: boolean;
    scrollSensitivity?: number;
    scrollSpeed?: number;
    initCallback?: Function;
    itemChangeCallback?: Function;
    itemResizeCallback?: Function;
    itemInitCallback?: Function;
    draggable?: Draggable;
    resizable?: Resizable;
    swap?: boolean;
    pushItems?: boolean;
    displayGrid?: displayGrid;
    disableWindowResize?: boolean;
    enableEmptyCellClickDrag?: boolean;
    emptyCellClickCallback?: Function;
    emptyCellDropCallback?: Function;
    api?: {
        resize?: Function;
        optionsChanged?: Function;
        getNextPossiblePosition?: Function;
    };
    [propName: string]: any;
}
export interface Draggable {
    enabled?: boolean;
    ignoreContentClass?: string;
    ignoreContent?: boolean;
    dragHandleClass?: string;
    stop?: Function;
    start?: Function;
}
export interface Resizable extends Draggable {
    handles?: {
        s: boolean;
        e: boolean;
        n: boolean;
        w: boolean;
        se: boolean;
        ne: boolean;
        sw: boolean;
        nw: boolean;
    };
}
