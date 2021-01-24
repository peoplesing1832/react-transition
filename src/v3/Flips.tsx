import * as React from 'react';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  ChildrenMap,
} from './Observer';

interface FlipsProps {
  wrap?: string; // 是否添加一层包裹
  wrapClass?: string; // 包裹的class名称
  name?: string; // 添加类名的前缀
  children?: React.ReactNode
  inOutDuration?: number; // 非flip动画的过渡时间，比如离开和进入的过渡时间
}

const getElementByFlipIdAll = (parent: HTMLElement) => {
  return parent.querySelectorAll(`[data-flip-id]`);
};

const Flips: React.FC<FlipsProps> = (props) => {
  const {
    inOutDuration = 200,
    wrap = 'div',
    wrapClass = '',
    name = 'r',
    children: _children,
  } = props;

  const _reflowRef = useRef<number>();
  const parentRef = useRef<HTMLElement>();
  const firstMount = useRef<boolean>(true);
  const prevRectsRef = useRef<{[key: string]: DOMRect}>();

  // 强制重绘
  const reflow = useCallback(() => {
    _reflowRef.current = document.body.offsetHeight;
  }, []);

  const relativeRect = useCallback((parent: HTMLElement, child: HTMLElement): DOMRect => {
    reflow();
    const parentRect = parent.getBoundingClientRect();
    let rect = child.getBoundingClientRect();
    rect.x = parentRect.x - rect.x;
    rect.y = parentRect.y - rect.y;
    return rect;
  }, []);

  // 添加类名
  const addClass = useCallback((ele: HTMLElement, className: string): void => {
    if (!className || !(className = className.trim())) {
      return;
    }
    ele.classList.add(className);
  }, []);

  // 删除类名
  const removeClass = useCallback((ele: HTMLElement, className: string): void => {
    if (!className || !(className = className.trim())) {
      return;
    }
    ele.classList.remove(className);
    if (!ele.classList.length) {
      ele.removeAttribute('class');
    }
  }, []);

  // 缓存之前的位置
  const force = () => {
    if (parentRef.current) {
      const flipEles = getElementByFlipIdAll(parentRef.current);
      const temp: { [key: string]: DOMRect } = {};
      for (let i = 0; i < flipEles.length; i++) {

        const flipEle = flipEles[i];
        const { flipId } = (flipEle as HTMLElement).dataset;
        if (flipId && flipEle) {
          temp[flipId] = relativeRect(parentRef.current, flipEle as HTMLElement);
        }
      }
      prevRectsRef.current = temp;
    }
  };

  const handleLeave = (key: React.ReactText) => {
    setChildren((prevChildren) => {
      if (key in prevChildren) {
        delete prevChildren[key];
      }
      return { ...prevChildren };
    });
  };

  const mergeMap = (prev: ChildrenMap, next: ChildrenMap): ChildrenMap => {
    prev = prev || {};
    next = next || {};
    function getValueForKey(key: React.ReactText) {
      return key in next ? next[key] : prev[key];
    }
    let nextKeysPending = Object.create(null);
    let pendingKeys = [];
    for (let prevKey in prev) {
      if (prevKey in next) {
        if (pendingKeys.length) {
          nextKeysPending[prevKey] = pendingKeys;
          pendingKeys = [];
        }
      } else {
        pendingKeys.push(prevKey);
      }
    }
    let i;
    let childMapping: ChildrenMap = {};
    for (let nextKey in next) {
      if (nextKeysPending[nextKey]) {
        for (i = 0; i < nextKeysPending[nextKey].length; i++) {
          let pendingNextKey = nextKeysPending[nextKey][i];
          childMapping[pendingNextKey] = getValueForKey(
            pendingNextKey
          );
        }
      }
      childMapping[nextKey] = getValueForKey(nextKey);
    }
    for (i = 0; i < pendingKeys.length; i++) {
      childMapping[pendingKeys[i]] = getValueForKey(pendingKeys[i]);
    }
    return childMapping;
  };

  const getMap = (
    children: React.ReactNode,
    callback?: (child: React.ReactNode) => React.ReactNode
  ): ChildrenMap => {
    const map = Object.create(null);
    if (children) {
      // 如果没有手动添加key, React.Children.map会自动添加key
      React.Children.map(children, c => c)?.forEach((child) => {
        const key = (child as React.ReactElement).key || '';
        if (key) {
          if (React.isValidElement(child) && callback) {
            map[key] = callback(child);
          } else {
            map[key] = child;
          }
        }
      });
    }
    return map;
  };

  const initChildren = (
    children: React.ReactNode,
  ): ChildrenMap => {
    return getMap(children, (child) => {
      return React.cloneElement(child as React.ReactElement, {
        _inOutDuration: inOutDuration,
        _name: name,
        _animation: true,
        _onLeaveed: () => {
          const key = (child as React.ReactElement).key || '';
          handleLeave(key);
        },
      });
    });
  };

  const nextChildren = (
    nextChildren: React.ReactNode,
    prevChildrenMap: ChildrenMap,
  ): ChildrenMap => {
    const nextChildrenMap = getMap(nextChildren);
    const children = mergeMap(prevChildrenMap, nextChildrenMap);
    Object.keys(children).forEach(key => {
      const child = children[key];
      if (!React.isValidElement(child)) {
        return;
      }
      const hasKeyByNew = nextChildrenMap[key] !== undefined;
      const hasKeyByPrev = prevChildrenMap[key] !== undefined;
      const isNew = hasKeyByNew && !hasKeyByPrev;
      const isDelete = !hasKeyByNew && hasKeyByPrev;
      const isNeverChange = hasKeyByNew && hasKeyByPrev;
      const prevProps = ((prevChildrenMap[key] as React.ReactElement)?.props as any);
      if (isNew) {
        children[key] = React.cloneElement(child, {
          _name: name,
          _inOutDuration: inOutDuration,
          _animation: true,
          _onLeaveed: () => {
            const key = (child as React.ReactElement).key || '';
            handleLeave(key);
          },
        });
      } else if (isDelete) {
        children[key] = React.cloneElement(child, {
          _animation: false,
        });
      } else if (isNeverChange) {
        children[key] = React.cloneElement(child, {
          _animation: prevProps._animation,
          _name: prevProps._name,
          _inOutDuration: prevProps._inOutDuration,
          _onLeaveed: () => {
            const key = (child as React.ReactElement).key || '';
            handleLeave(key);
          },
        });
      }
    });
    return children;
  };

  const [children, setChildren] = useState<ChildrenMap>(() => {
    return initChildren(_children);
  });

  useEffect(() => {
    if (!firstMount.current) {
      setChildren(nextChildren(_children, children));
    } else {
      firstMount.current = false;
    }
  }, [_children]);

  useLayoutEffect(() => {
    const tasks = [];
    if (parentRef.current && prevRectsRef.current) {
      const flipEles = getElementByFlipIdAll(parentRef.current);
      const moveClass = `${name}-move`;
      const nextRects: {[key: string]: DOMRect} = {};
      // 统一计算最新的样式
      for (let i = 0; i < flipEles.length; i++) {
        const flipEle = flipEles[i];
        const { flipId } = (flipEle as HTMLElement).dataset;
        if (flipId && flipEle) {
          removeClass(flipEle as HTMLElement, moveClass);
          nextRects[flipId] = relativeRect(parentRef.current, flipEle as HTMLElement);
          if (!prevRectsRef.current[flipId]) {
            prevRectsRef.current[flipId] = nextRects[flipId];
          }
        }
      }
      // 计算之前样式与现在的样式的差，并设置样式
      for (let i = 0; i < flipEles.length; i++) {
        const flipEle = flipEles[i];
        const { flipId } = (flipEle as HTMLElement).dataset;
        if (flipId && flipEle) {
          const nextRect = nextRects[flipId];
          const prevRect = prevRectsRef.current[flipId];
          let x = nextRect.x - prevRect.x;
          let y = nextRect.y - prevRect.y;
          if ((x !== 0 || y !== 0)) {
            const s = (flipEle as HTMLElement).style;
            s.transform = s.webkitTransform = `translate(${x}px,${y}px)`;
            s.transitionDuration = '0s';
            tasks.push(() => {
              addClass(flipEle as HTMLElement, moveClass);
              s.transform = s.webkitTransform = s.transitionDuration = '';
              (flipEle as HTMLElement).addEventListener('transitionend', function cb (e) {
                if (e && e.target !== flipEle) {
                  return
                }
                if (!e || /transform$/.test(e.propertyName)) {
                  (flipEle as HTMLElement).removeEventListener('transitionend', cb);
                  // 删除move类
                  removeClass(flipEle as HTMLElement, moveClass);
                }
              });
            })
          }
        }
      }
      // 统一强制刷新
      reflow();
      // 统一开始动画
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        task();
      }
    }
  });

  const ChildNode = Object.values(children);

  const WrapChildNode = React.createElement(wrap, {
    className: wrapClass,
    ref: parentRef,
  }, ChildNode);

  force();

  return (
    <>
      { WrapChildNode }
    </>
  );
}

export default React.memo(Flips);
