import React from 'react';
export declare enum STATUS {
    UNMOUNTED = "unmounted",
    ENTERED = "entered",
    ENTERING = "entering",
    LEAVEED = "leaveed",
    LEAVEING = "leaveing"
}
export declare type TransitionDuration = {
    enter: number;
    leave: number;
};
export interface TransitionProps {
    name?: string;
    duration?: number | TransitionDuration;
    delay?: number;
    animation?: boolean;
    unmount?: boolean;
    onUnmounted?: () => void;
    onEntered?: () => void;
    onEntering?: () => void;
    onLeaveed?: () => void;
    onLeaveing?: () => void;
    leaveDisplayNone?: boolean;
    children: React.ReactElement;
    appear?: boolean;
}
declare const Transition: React.FC<TransitionProps>;
export default Transition;
