import React, { PureComponent } from 'react';

import { web3 as w3, getNetworkId, getTxReceipt } from '../../../helpers/eth';
import Eos from '../../../helpers/eos';
import Spinner from '../../common/Spinner';
import UnlockMetamaskPopover from '../../common/unlock-metamask-popover/UnlockMetamaskPopover';
import { eosConstants } from '../../../constants/constants';

class DeployStep2 extends PureComponent {
  componentWillMount() {
    window.scrollTo(0, 0);
  }

  deploy(e) {
    e.preventDefault();

    const { bin, blockchain, abi } = this.props.instance;
    const { price_eth } = this.props.ctor;
    const { deployId, deployTxSent, deployTxError, deployTxMined, metamaskStatus } = this.props;

    if (blockchain === 'ethereum' && metamaskStatus != 'okMetamask') return null;

    const callback = (err, txHash) => {
      if (err) {
        let errMsg = '';
        try {
          errMsg = err.message.split('\n')[0];
        } catch (error) {
          errMsg = 'Unknown error';
        }
        deployTxError(deployId, errMsg);
      } else {
        getNetworkId((netId) => deployTxSent(deployId, netId, txHash, blockchain));

        getTxReceipt(txHash, (receipt) => {
          if (!receipt.status || receipt.status === '0x0' || receipt.status === '0') {
            deployTxError(deployId, 'Something went wrong!');
          } else {
            deployTxMined(deployId, receipt.contractAddress);
          }
        });
      }
    };

    switch (blockchain) {
      case 'ethereum':
        w3.eth.sendTransaction(
          {
            data: `0x${bin}`,
            value: w3.toWei(price_eth, 'ether'),
            gas: 4400000,
            gasPrice: 10e9
          },
          callback
        );
        break;
      case 'eos':
        let adrress;
        Eos.deployContract(bin, abi)
          .then((result) => {
            const identity = Eos.currentIdentity;
            let accountName = '';

            if (Array.isArray(identity.accounts) && identity.accounts.length > 0) {
              accountName = identity.accounts[0].name;
            }

            Eos.getEos()
              .contract(accountName)
              .then((result) => {
                console.log(result);
              })
              .catch((err) => {
                console.log(err);
              });

            deployTxMined(deployId, accountName);
          })
          .catch((error) => {
            console.error(error);
            let msg = error.message ? JSON.parse(error.message) : JSON.parse(error);

            if (
              msg.error &&
              msg.error.details &&
              Array.isArray(msg.error.details) &&
              msg.error.details.length > 0
            ) {
              msg = msg.error.details[0].message;
            }

            deployTxError(deployId, msg);
          });

        deployTxSent(deployId, eosConstants.CHAIN_ID, '---', blockchain);
        break;
      default:
        break;
    }
  }

  render() {
    const { deployId, ctor, instance, status, setPublicAccess, blockchain } = this.props;

    return (
      <div>
        {/* popover 'Unlock metamask' */}
        {blockchain === 'ethereum' &&
          metamaskStatus === 'unlockMetamask' && <UnlockMetamaskPopover />}

        {status === 'construct_request' && (
          <div className="block__wrapper  block__wrapper--top">
            <Spinner text="Preparing code, this can take some seconds..." />
          </div>
        )}

        {status === 'construct_success' && (
          <form>
            <div className="block__wrapper  block__wrapper--top">
              <fieldset className="form-block">
                <div className="form-field">
                  <label className="form-field__label">Your smart contract source code</label>
                  <span className="form-block__description">
                    Carefully prepared for you using only the finest ingredients
                  </span>
                  <div className="form-field__input-wrapper">
                    <div
                      id="textarea"
                      className="form-field__input  form-field__input--textarea"
                      style={{
                        height: '500px',
                        overflowY: 'auto',
                        fontSize: '12px',
                        whiteSpace: 'pre',
                        fontFamily: 'monospace'
                      }}>
                      {instance.source ||
                        "If you don't see source code here, perhaps something gone wrong"}
                    </div>
                  </div>
                </div>
              </fieldset>
              <fieldset className="block__wrapper  block__wrapper--terms">
                <fieldset className="form-block  form-block--terms">
                  <div className="form-field  form-field--terms">
                    <input
                      type="checkbox"
                      className="form-field__input  form-field__input--checkbox form-field__input--terms  visually-hidden"
                      id="restrict-public-access"
                      onChange={(e) => {
                        setPublicAccess(deployId, !e.target.checked);
                      }}
                    />
                    <label
                      className="form-field__label  form-field__label--checkbox  form-field__label--terms"
                      htmlFor="restrict-public-access">
                      <svg
                        className="form-field__icon  form-field__icon-checkbox"
                        width="23"
                        height="23">
                        <use className="form-field__icon-off" href="#checkbox" />
                        <use className="form-field__icon-on" href="#checkbox-on" />
                      </svg>
                      <span className="form-field__wrapper">
                        <b className="form-field__description  form-field__description--terms">
                          Restrict public access to the contract UI.
                        </b>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </fieldset>
              <button className="button block__button" onClick={this.deploy.bind(this)}>
                {ctor.price_eth ? (
                  <span>Deploy now for {ctor.price_eth} ETH</span>
                ) : (
                  <span>Deploy now for free</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }
}

export default DeployStep2;
