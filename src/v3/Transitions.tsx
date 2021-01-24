// Thank you https://github.com/reactjs/react-transition-group/blob/master/src/utils/ChildMapping.js
import React, {
  useEffect,
  useState,
  useRef,
} from 'react';

export interface TransitionsProps {
  masterSwitch?: boolean; // 统一的动画开关(会对所有children的animation做设置)
  interval?: number; // 每一个动画之间的时间间隔
  prefix: string;
}

export type Animations = {
  [key: string]: {
    delay: number;
    animation: boolean;
  },
};

export const TransitionsContext = React.createContext<{
  animations: Animations,
  collection: string[];
  prefix: string;
}>({
  animations: {},
  collection: [],
  prefix: '',
});

const Transitions: React.FC<TransitionsProps> = (props) => {
  const {
    masterSwitch = false,
    interval = 200,
    prefix = '',
    children,
  } = props;

  const [animations, setAnimations] = useState<Animations>({});
  const collection = useRef<string[]>([]);

  useEffect(() => {
    const _collection = [...collection.current];
    const ids = masterSwitch ? _collection : _collection.reverse();
    const animations: Animations = {};
    let counter = 0;
    ids.forEach((id) => {
      animations[id] = {
        delay: counter * interval,
        animation: masterSwitch,
      };
      counter += 1;
    });
    setAnimations(animations);
  }, [masterSwitch, interval]);

  return (
    <TransitionsContext.Provider value={{
      animations,
      collection: collection.current,
      prefix,
    }}>
      { children }
    </TransitionsContext.Provider>
  )
};

export default Transitions;
