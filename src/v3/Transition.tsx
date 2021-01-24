import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useContext,
} from 'react';
import { TransitionsContext } from './Transitions';
import uuid from '../util/uuid';

// unmounted -> leaveed -> entering -> entered -> leaveing -> leaveed -> unmounted
// unmounted组件卸载状态
const noop = () => {};

export enum STATUS {
  UNMOUNTED = 'unmounted', // 卸载
  ENTERED = 'entered', // 显示状态
  ENTERING = 'entering', // 进入时的状态，从LEAVEED态过渡到ENTERED态
  LEAVEED = 'leaveed', // 离开状态
  LEAVEING = 'leaveing', // 离开时的状态，从ENTERED态过渡LEAVEED态
};

export type TransitionDuration = {
  enter: number; // entering的过渡时间
  leave: number; // leaveing的过渡时间
};

export interface TransitionProps {
  name?: string; // 过渡类的前缀
  duration?: number | TransitionDuration; // 状态的过渡时间
  delay?: number; // 延迟时间，进入entering，leaveing前的时间
  animation?: boolean; // 过渡的开关
  unmount?: boolean; // 是否在leaveed态之后卸载组件
  onUnmounted?: () => void; // 卸载组件时的事件
  onEntered?: () => void; // 进入entered时的事件
  onEntering?: () => void; // 进入entering时的事件
  onLeaveed?: () => void; // 进入leaveed时的事件
  onLeaveing?: () => void; // 进入leaveing时的事件
  // display的开关，直接在样式中设置display可能会造成过渡失败
  // 开始display后，LEAVEED时会添加display: none的style
  leaveDisplayNone?: boolean;
  children: React.ReactElement;
  appear?: boolean;
};

type waitForTransitionStartCallback = (...args: any[]) => any;

const durationDefaults = 200;
const delayDefaults = 0;

const Transition: React.FC<TransitionProps> = (props) => {
  const {
    name = 'r',
    duration = durationDefaults,
    delay = delayDefaults,
    animation = false,
    unmount = false,
    onUnmounted = noop,
    onEntered = noop,
    onEntering = noop,
    onLeaveed = noop,
    onLeaveing = noop,
    leaveDisplayNone = false,
    appear = false,
    children,
  } = props;

  // 动画的开关
  const [_animation, setAnimation] = useState<boolean>(animation);
  // 动画的状态
  const [status, setStatus] = useState<STATUS>(() => {
    if (_animation) {
      if (appear) {
        return STATUS['ENTERED'];
      } else {
        return STATUS['LEAVEED'];
      }
    } else {
      if (unmount) {
        return STATUS['UNMOUNTED'];
      } else {
        return STATUS['LEAVEED'];
      }
    }
  });
  // 间隔渲染，主要用在一组动画中，默认为0
  const [interval, setIntervalTime] = useState<number>(0);
  // 是否为初次渲染
  const firstMount = useRef(true);
  // 最初元素的classNames
  const prevClassNames = useRef(children.props.className || '');
  // 最初元素的styles
  const prevStyle = useRef(children.props.style || '');
  // 当前动画组件的唯一id
  const id = useRef(uuid());
  const timers = useRef(new Set<NodeJS.Timeout>([]));
  const rAF = typeof window !== 'undefined' && window.requestAnimationFrame;
  const {
    prefix,
    animations,
    collection,
  } = useContext(TransitionsContext);

  /**
   * 等待浏览器渲染完成
   */
  const waitForTransitionStart = rAF ? (callback: waitForTransitionStartCallback) => {
    rAF(() => {
      rAF(callback);
    })
  } : (callback: waitForTransitionStartCallback) => {
    setTimeout(callback, 50);
  };

  /**
   * 等待动画过渡完成后，执行回调
   */
  const waitTransition = (
    duration: number,
    callback: waitForTransitionStartCallback
  ) => {
    const timer = setTimeout(callback, duration);
    return timer;
  };

  /**
   * 处理STATUS['UNMOUNTED']状态
   */
  const handleUnmounted = () => {
    if (!firstMount.current) {
      // 初次渲染时不触发onUnmounted钩子
      onUnmounted();
    }
    if (_animation) {
      // 如果是STATUS['UNMOUNTED']状态，并且animation为true。
      // 我们需要先将状态设置为STATUS['LEAVEED']态
      setStatus(STATUS['LEAVEED']);
    } else {
    }
  };

  /**
   * 处理STATUS['LEAVEED']状态
   */
  const handleLeaveed = () => {
    if (_animation) {
      // 如果开关为开，当前是STATUS['LEAVEED']态，我们下一步需要进入到STATUS['ENTERING']态
      // 使用waitForTransitionStart，等待浏览器渲染完成
      waitForTransitionStart(() => {
        // 如果有延迟，需要等待延迟进入ENTERING态
        let transitionDelay = delay;
        transitionDelay += interval;
        const timer = waitTransition(transitionDelay, () => {
          setStatus(STATUS['ENTERING']);
        });
        timers.current.add(timer);
      });
    } else {
      // 触发leaveed的钩子，只有在真正离开的状态才触发，unmounted -> leaveed状态时不触发
      onLeaveed()
      // Observer注入的监听事件
      const { _onLeaveed } = props as any;
      if (_onLeaveed) {
        _onLeaveed();
      }
      // 如果开关为关。并且unmount设置为true，需要将状态设置为STATUS['UNMOUNTED']
      if (unmount) {
        setStatus(STATUS['UNMOUNTED']);
      }
    }
  };

  /**
   * 处理STATUS['LEAVEING']状态
   */
  const handleLeaveing = () => {
    // 触发leaveing钩子
    onLeaveing();
    if (_animation) {
      // 如果开关为开，下一步需要过渡到STATUS['ENTERING']状态
      let transitionDelay = delay;
      transitionDelay += interval;
      const timer = waitTransition(transitionDelay, () => {
        setStatus(STATUS['ENTERING']);
      });
      timers.current.add(timer);
    } else {
      // 如果开关为关，下一步需要进入等待过渡完成后进入，STATUS['LEAVEED']状态
      let transitionDuration = typeof duration === 'number' ? duration : duration.leave;
      const timer = waitTransition(transitionDuration, () => {
        setStatus(STATUS['LEAVEED']);
      });
      timers.current.add(timer);
    }
  };

  /**
   * 处理STATUS['ENTERED']状态
   */
  const handleEntered = () => {
    // 触发onEntered的钩子
    onEntered();
    if (_animation) {
      // 如果开关为开，不处理
    } else {
      // 如果开关为关，需要进入到['LEAVEING']状态
      let transitionDelay = delay;
      transitionDelay += interval;
      const timer = waitTransition(transitionDelay, () => {
        setStatus(STATUS['LEAVEING']);
      });
      timers.current.add(timer);
    }
  };

  /**
   * 处理STATUS['ENTERING']状态
   */
  const handleEntering = () => {
    // 触发onEntering钩子
    onEntering();
    if (_animation) {
      // 如果动画开关为开，等待过渡完成后进入STATUS['ENTERED']状态
      let transitionDuration = typeof duration === 'number' ? duration : duration.enter;
      const timer = waitTransition(transitionDuration, () => {
        setStatus(STATUS['ENTERED']);
      });
      timers.current.add(timer);
    } else {
      // 如果动画开关为关，需要进入到STATUS['LEAVEING']
      let transitionDelay = delay;
      transitionDelay += interval;
      const timer = waitTransition(transitionDelay, () => {
        setStatus(STATUS['LEAVEING']);
      });
      timers.current.add(timer);
    }
  };

  useEffect(() => {
    timers.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timers.current.clear();
    switch (status) {
      case STATUS['UNMOUNTED']:
        handleUnmounted();
        break;
      case STATUS['LEAVEED']:
        handleLeaveed();
        break;
      case STATUS['LEAVEING']:
        handleLeaveing();
        break;
      case STATUS['ENTERED']:
        handleEntered();
        break;
      case STATUS['ENTERING']:
        handleEntering();
        break;
    }
    // 标记为不是初次渲染
    firstMount.current = false;
  }, [status, _animation]);

  useEffect(() => {
    const currentId = id.current;
    if (animations[currentId]) {
      const {
        animation,
        delay,
      } = animations[currentId];
      setIntervalTime(delay);
      setAnimation(animation);
    }
  }, [animations]);

  useEffect(() => {
    setAnimation(animation);
  }, [animation]);


  useEffect(() => {
    if (collection) {
      collection.push(id.current);
    }
  }, []);

  const className = useMemo(() => {
    const classPrefix = prefix ? prefix : name;
    switch (status) {
      case STATUS['LEAVEED']:
        return `${classPrefix}-leaveed`;
      case STATUS['LEAVEING']:
        return `${classPrefix}-leaveing`;
      case STATUS['ENTERED']:
        return `${classPrefix}-entered`;
      case STATUS['ENTERING']:
        return `${classPrefix}-entering`;
    }
  }, [status, prefix, name]);

  const nextStyle = useMemo(() => {
    if (status === STATUS['LEAVEED'] && leaveDisplayNone && !_animation) {
      return {
        display: 'none',
      };
    }
    return null;
  }, [leaveDisplayNone, status, _animation]);

  if (status === STATUS['UNMOUNTED']) {
    return null;
  }

  const nextClassName = prevClassNames.current ?
    `${className} ${prevClassNames.current}`
    : `${className}`;

  return React.cloneElement(React.Children.only(children), {
    className: nextClassName,
    style: {
      ...prevStyle.current,
      ...nextStyle,
    },
  });
};

export default Transition;
