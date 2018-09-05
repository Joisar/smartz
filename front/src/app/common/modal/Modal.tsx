import * as classNames from 'classnames';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import InlineSVG from 'svg-inline-react';

import { Key } from '../../../types/enums';

import './Modal.less';


interface IModalProps {
  state: any;
  onClose: () => void;
  isCloseEsc?: boolean;
  classNameWindow?: string;
  isBackdrop?: boolean;
  isCloser?: boolean;
  blur?: {
    size: number;
    block: string;
    duration: number;
  };
  animationWindow?: {
    duration: number;
    styleStart: object;
    styleEnd: object;
  };
  animationBackdrop?: {
    duration: number;
    styleStart: object;
    styleEnd: object;
  };
}

export default class Modal extends React.PureComponent<IModalProps, {}> {
  private node: HTMLDivElement;
  private body: HTMLBodyElement;

  constructor(props) {
    super(props);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.getStyle = this.getStyle.bind(this);
  }

  private onKeyDown(event) {
    const { onClose, isCloseEsc = true } = this.props;

    if (event.keyCode === Key.ESC && isCloseEsc) {
      onClose();
      return;
    }
  }

  private getStyle(settings: object, state: string): object {
    if (settings != null) {
      const transitionStyles = {
        entering: settings['styleStart'],
        entered: settings['styleEnd'],
        exiting: settings['styleStart'],
      };

      return {
        transition: `all ${settings['duration']}ms ease-out`,
        ...transitionStyles[state],
      };
    } else {
      return null;
    }
  }

  public componentWillMount() {
    // create dom-element and inject to dom
    this.node = document.createElement('div');
    this.node.setAttribute('id', 'component-modal');
    document.body.appendChild(this.node);

    this.body = document.getElementsByTagName('body')[0];
  }

  public componentDidMount() {
    const { isCloseEsc = true } = this.props;

    if (isCloseEsc) {
      document.addEventListener('keydown', this.onKeyDown);
    }

    this.body.classList.add('modal-disable-scroll');
  }

  public componentWillUnmount() {
    const { isCloseEsc = true } = this.props;

    if (isCloseEsc) {
      document.removeEventListener('keydown', this.onKeyDown);
    }

    if (this.body.classList.contains('modal-disable-scroll')) {
      this.body.classList.remove('modal-disable-scroll');
    }

    document.body.removeChild(this.node);
  }


  public render() {
    const {
      onClose,
      children,
      isCloser = true,
      isBackdrop = true,
      state,
      blur = null,
      animationWindow = null,
      animationBackdrop = null,
      classNameWindow = null,
    } = this.props;

    // set blur effect on div block
    if (blur != null) {
      const elem = document.getElementById(blur.block);

      if (elem !== undefined) {
        elem.style.transition = `filter ${blur.duration}ms ease-out`;

        switch (state) {
          case 'entered':
          case 'entering':
            elem.style.filter = `blur(${blur.size}px)`;
            break;

          case 'exiting':
          case 'exited':
            elem.style.filter = `blur(0px)`;
            break;

          default:
            break;
        }
      }
    }

    const content = (
      <div className="component-modal flex-h" >

        {/* backDrop */}
        {isBackdrop &&
          <div
            className="component-modal-backdrop"
            onClick={onClose}
            style={this.getStyle(animationBackdrop, state)}
          />
        }

        <div
          className={classNames('component-modal-window', classNameWindow)}
          style={this.getStyle(animationWindow, state)}
        >

          {/* closer */}
          {isCloser &&
            <button
              className="component-modal-close"
              type="button"
              aria-label="Close"
              onClick={onClose}
            >
              <InlineSVG
                className="x-icon"
                src={require('../../../assets/img/common/x-icon.svg')}
              />
            </button>
          }

          {/* content */}
          {children}
        </div>
      </div>
    );

    return ReactDOM.createPortal(content, this.node);
  }
}

