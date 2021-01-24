import * as React from 'react';
interface ObserverProps {
    wrap?: string;
    wrapClass?: string;
    children?: any;
}
export declare type ChildrenMap = {
    [key: string]: React.ReactNode;
};
declare const Observer: React.FC<ObserverProps>;
export default Observer;
