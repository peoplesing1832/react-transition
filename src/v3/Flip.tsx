import * as React from 'react';
import {
  useRef,
  useLayoutEffect,
  useContext,
} from 'react';
import Transition from './Transition';
import { FlipsContext } from './Flips';

const getRect = (ele: HTMLElement): DOMRect => {
  return ele.getBoundingClientRect();
};

const getParent = (el: HTMLElement): HTMLElement => {
  return el.parentNode as HTMLElement;
};

export interface FlipProps {
  children: React.ReactElement;
}

const Flip: React.FC<FlipProps> = (props) => {
  const {
    children,
  } = props;

  const {
    _inOutDuration: inOutDuration, // 离开，进入的过渡时长，需要和class中transtion一致
    _animation: animation, // 离开，进入动画的开关
    _onLeaveed: onLeaveed,
    _name: name, // class的前缀
  } = props as any;

  const selfRef = useRef<HTMLElement>();
  const prevRectRef = useRef<DOMRect>();
  const _reflowRef = useRef<number>();
  // eslint-disable-next-line
  // @ts-ignore
  const { forceUpdate } = useContext(FlipsContext);

  // 强制重绘
  const reflow = () => {
    _reflowRef.current = document.body.offsetHeight;
  };

  // 获取相对的rect
  const relativeRect = (parent: HTMLElement, child: HTMLElement): DOMRect => {
    const parentRect = getRect(parent);
    const rect = getRect(child);
    rect.x = parentRect.x - rect.x;
    rect.y = parentRect.y - rect.y;
    return rect;
  };

  const addClass = (ele: HTMLElement, className: string): void => {
    if (!className || !(className = className.trim())) {
      return;
    }
    ele.classList.add(className);
  };

  const removeClass = (ele: HTMLElement, className: string): void => {
    if (!className || !(className = className.trim())) {
      return;
    }
    ele.classList.remove(className);
    if (!ele.classList.length) {
      ele.removeAttribute('class');
    }
  };

  const force = () => {
    const flipEle = selfRef.current;
    if (flipEle) {
      const parent = getParent(flipEle);
      const rect = relativeRect(parent, flipEle);
      prevRectRef.current = rect;
    }
  };

  useLayoutEffect(() => {
    const flipEle = selfRef.current
    if (flipEle && prevRectRef.current) {
      const moveClass = `${name}-move`;
      const parent = getParent(flipEle);
      const nextRect = relativeRect(parent, flipEle);
      const prevRect = prevRectRef.current;
      const x = nextRect.x - prevRect.x;
      const y = nextRect.y - prevRect.y;
      // 没有变化就不进行处理
      if (x === 0 && y === 0) {
        return;
      }
      const s = flipEle.style;
      s.transform = s.webkitTransform = `translate(${x}px,${y}px)`;
      s.transitionDuration = '0s';
      // 强制重绘
      reflow();
      // 添加move类
      addClass(flipEle, moveClass);
      s.transform = s.webkitTransform = s.transitionDuration = '';
      // 监听transition事件
      flipEle.addEventListener('transitionend', function cb (e) {
        if (e && e.target !== flipEle) {
          return
        }
        if (!e || /transform$/.test(e.propertyName)) {
          flipEle.removeEventListener('transitionend', cb);
          // 删除move类
          removeClass(flipEle, moveClass);
        }
      });
    }
  });

  const child = React.cloneElement(React.Children.only(children), {
    ref: selfRef
  });

  force();

  return (
    <Transition
      name={name}
      animation={animation}
      onLeaveed={onLeaveed}
      duration={inOutDuration}
      unmount={true}
    >
      { child }
    </Transition>
  );
};

export default Flip;
