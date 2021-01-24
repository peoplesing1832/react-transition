import React from 'react';
export interface TransitionsProps {
    masterSwitch?: boolean;
    interval?: number;
    prefix: string;
}
export declare type Animations = {
    [key: string]: {
        delay: number;
        animation: boolean;
    };
};
export declare const TransitionsContext: any;
declare const Transitions: React.FC<TransitionsProps>;
export default Transitions;
