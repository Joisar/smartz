import { filter } from 'lodash';
import * as React from 'react';

import * as api from '../../api/apiRequests';
import { blockchains } from '../../constants/constants';
import { IS_MOBILE_OS } from '../../helpers/detect-device';
import history from '../../helpers/history';
import store from '../../store/store';
import { setTrustBanner } from '../AppActions';
import CtorCard from '../common/ctor-card/CtorCard';
import DevBlock from '../common/dev-block/DevBlock';
import Loader from '../common/loader/Loader';
import PopupContainer from '../common/popup/PopupContainer';
import Banner from './banner/Banner';
import CustomContract from './custom-contract/CustomContract';
import PopupTrust from './popup-trust/PopupTrust';
import SortBlockchain from './sort-blockchain/SortBlockchain';

import './Store.less';


interface IStoreProps {
  ctors: any;
}

interface IStoreState {
  blockchain: any;
  isOpenPopup: boolean;
  refLink: string;
}

export default class Store extends React.Component<IStoreProps, IStoreState> {
  constructor(props) {
    super(props);

    this.state = {
      blockchain: blockchains.ethereum,
      isOpenPopup: false,
      refLink: '',
    };

    this.setBlockchain = this.setBlockchain.bind(this);
    this.goToDeploy = this.goToDeploy.bind(this);
    this.closePopup = this.closePopup.bind(this);
  }

  private goToDeploy(path: string) {
    return () => {
      if (IS_MOBILE_OS) {
        this.setState({
          isOpenPopup: true,
          refLink: `${window.location.origin}${path}`,
        });
      } else {
        history.push(`${path}`);
      }
    };
  }

  private closePopup() {
    store.dispatch(setTrustBanner());
    this.setState({ isOpenPopup: false });
  }

  private setBlockchain(blockchain) {
    return () => {
      this.setState({ blockchain });
    };
  }

  public componentDidMount() {
    api.getConstructors();
  }

  public render() {
    const { ctors } = this.props;
    const { blockchain } = this.state;

    const filteredCtors = filter(ctors, { blockchain });

    return (
      <main className="page-main  page-main--store">
        {/* Banner section */}
        <section className="banner-section">
          <Banner />
        </section>

        {/* Sorting section */}
        <section className="sort-section">
          <SortBlockchain onClick={this.setBlockchain} blockchain={this.state.blockchain} />
        </section>

        {/* Constructors section */}
        <section className="ctor-section">
          {filteredCtors.length > 0 && (
            <ul className="ctor-list">
              {filteredCtors.filter((el) => el.is_public).map((el, i) => (
                <li key={i} className="ctor-item">
                  <CtorCard ctor={el} onClick={this.goToDeploy(`/deploy/${el.id}`)} />
                </li>
              ))}
              {/* Add custom contract */}
              <li key={'custom-contract'} className="ctor-item">
                <CustomContract />
              </li>
            </ul>
          )}

          {filteredCtors.length === 0 && <Loader text="Loading constructors" />}
        </section>

        {/* Banner for developers section */}
        <section className="dev-section">
          <DevBlock />
        </section>

        {/* Popup */}
        <PopupContainer
          isOpen={this.state.isOpenPopup}
          onClose={this.closePopup}
          blur={{
            size: 5,
            block: 'js-app',
            duration: 300,
          }}
          animationWindow={{
            duration: 300,
            styleStart: { bottom: '-360px' },
            styleEnd: { bottom: 0 },
          }}
          animationBackdrop={{
            duration: 300,
            styleStart: { opacity: 0 },
            styleEnd: { opacity: 1 },
          }}
        >
          <PopupTrust
            onClose={this.closePopup}
            refLink={'https://smartz.io/deploy/5aaa7a85ab3d71000bd0c69d/'} />
        </PopupContainer>
      </main >
    );
  }
}
