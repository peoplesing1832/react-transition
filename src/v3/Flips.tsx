import * as React from 'react';
import {
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  ChildrenMap
} from './Observer';

interface FlipsProps {
  inOutDuration?: number; // 非flip动画的过渡时间，比如离开和进入的过渡时间
  wrap?: string | false; // 是否添加一层包裹
  wrapClass?: string; // 包裹的class名称
  name?: string; // 添加类名的前缀
}

export const FlipsContext = React.createContext<{
  forceUpdate: any;
}>({
  forceUpdate: null
});

const Flips: React.FC<FlipsProps> = (props) => {

  const {
    inOutDuration = 200,
    wrap = 'div',
    wrapClass = '',
    name = 'r',
    children: _children,
  } = props;

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
          _inOutDuration: prevProps._inOutDuration,
          _name: prevProps._name,
          _onLeaveed: () => {
            const key = (child as React.ReactElement).key || '';
            handleLeave(key);
          },
        });
      }
    });
    return children;
  };

  const firstMount = useRef<boolean>(true);
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

  const ChildNode = Object.values(children);

  if (wrap) {
    const WrapChildNode = React.createElement(wrap, {
      className: wrapClass,
    }, ChildNode);

    return (
      <FlipsContext.Provider value={{
        forceUpdate: children
      }}>
        { WrapChildNode }
      </FlipsContext.Provider>
    );
  }

  return (
    <FlipsContext.Provider value={{
      forceUpdate: children
    }}>
      { ChildNode }
    </FlipsContext.Provider>
  );
}

export default Flips;
