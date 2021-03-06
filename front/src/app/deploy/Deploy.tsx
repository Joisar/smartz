import * as React from 'react';

import * as api from '../../api/apiRequests';
import { transformObj2Flat } from '../../helpers/normalize';
import Auth from '../auth/Auth';
import Alert from '../common/Alert';
import Loader from '../common/loader/Loader';
import DeployHeader from './deploy-header/DeployHeader';
import DeployStep1 from './deploy-step-1/DeployStep1';
import DeployStep2 from './deploy-step-2/DeployStep2';
import DeployStep3 from './deploy-step-3/DeployStep3';

import './Deploy.less';


// TODO: refactor this file totally

interface IDeployProps {
  status: any;
  initDeploy: any;
  ctor: any;
  errors: any;
  dapp: any;
  netId: any;
  txHash: any;
  contractAddress: any;
  metamaskStatus: any;
  setPublicAccess: any;
  deployTxSent: any;
  deployTxError: any;
  deployTxMined: any;
  formData: any;
  blockchain: any;
  publicAccess: any;
}

interface IDeployState {
  ctorId: any;
  deployId: any;
}

class Deploy extends React.PureComponent<IDeployProps, IDeployState> {
  constructor(props) {
    super(props);

    const { ctorId, deployId } = props.match.params;

    this.state = {
      ctorId,
      deployId,
    };
  }

  public componentDidMount() {
    window.Intercom('update');
  }

  public componentWillMount() {
    const { status, initDeploy } = this.props;
    const { ctorId, deployId } = this.state;

    if (Auth.isAuthenticated()) {
      if (!status) {
        initDeploy(deployId);
      }

      api.getConstructorParams(ctorId, deployId);
    }
  }

  public componentWillReceiveProps(nextProps) {
    const { netId, contractAddress, dapp, publicAccess } = nextProps;
    if (netId && contractAddress) {
      const data = {
        address: contractAddress,
        network_id: netId,
        has_public_access: publicAccess,
      };
      api.updateDapp(dapp.id, data);
    }
  }

  public render() {
    const { deployId } = this.state;
    const {
      ctor,
      status,
      errors,
      dapp,
      netId,
      txHash,
      contractAddress,
      metamaskStatus,
      setPublicAccess,
      deployTxSent,
      deployTxError,
      deployTxMined,
      formData,
      blockchain,
      publicAccess,
    } = this.props;

    const step1Props = { deployId, ctor, formData, errors };

    const step2Props = {
      deployId,
      ctor,
      dapp,
      status,
      metamaskStatus,
      setPublicAccess,
      deployTxSent,
      deployTxError,
      deployTxMined,
      publicAccess,
    };

    const step3Props = {
      status,
      txHash,
      netId,
      dapp,
      contractAddress,
      blockchain,
    };

    if (metamaskStatus === 'noMetamask')
      return (
        <p
          style={{
            textAlign: 'center',
            margin: '100px',
            fontSize: '20px',
          }}>
          Fellow, you need a Metamask plugin!
        </p>
      );

    let errorList = null;
    if (errors !== null && errors !== undefined) {
      if (typeof errors === 'string') {
        errorList = <p>{errors}</p>;
      }

      if (typeof errors === 'object') {
        const errArr = transformObj2Flat(errors);

        errorList = Object.keys(errArr).map((err) => {
          const value = errArr[err];

          const listErr = Array.isArray(value) ? (
            value.map((item) => <li key={item}>{item}</li>)
          ) : (
              <li key={errArr[err]}>{errArr[err]}</li>
            );

          return (
            <span key={err}>
              <p>{err}:</p>
              <ul>{listErr}</ul>
            </span>
          );
        });
      }
    }

    return (
      <main className="page-main page-main--contracts">
        <DeployHeader ctor={ctor} />

        <section className="block">
          {ctor &&
            ctor.fetchStatus === 'request' && (
              <div className="block__wrapper  block__wrapper--top">
                <Loader text="Fetching contract details..." />
              </div>
            )}

          {errors && <Alert>{errorList}</Alert>}

          {((status === 'configure' && ctor && ctor.fetchStatus === 'success') ||
            (status === 'construct_error' && ctor.fetchStatus === 'success')) && (
              <DeployStep1 {...step1Props} />
            )}

          {(status === 'construct_request' || status === 'construct_success') && (
            <DeployStep2 {...step2Props} />
          )}

          {(status === 'transaction_sent' ||
            status === 'transaction_mined' ||
            status === 'transaction_error') && <DeployStep3 {...step3Props} />}
        </section>
      </main>
    );
  }
}

export default Deploy;
