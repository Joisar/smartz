import React from 'react';

import FileHashWidget from './hash-group/FileHashWidget';
import StringHashWidget from './hash-group/StringHashWidget';
import UnixTimeWidget from './UnixTimeWidget';
import EthCount from './EthCount';

import CheckboxWidget from './redefinitions/CheckboxWidget';
import RadioWidget from './redefinitions/RadioWidget';

import 'react-datetime/css/react-datetime.css';

// widgets for react-jsonschema-form
const widgetList = {
  // own widgets
  fileHash: (props) => <FileHashWidget {...props} />,
  stringHash: (props) => <StringHashWidget {...props} />,
  unixTime: (props) => <UnixTimeWidget {...props} />,
  ethCount: (props) => <EthCount {...props} />,

  // redefinition internal widgets
  CheckboxWidget: (props) => <CheckboxWidget {...props} />,
  RadioWidget: (props) => <RadioWidget {...props} />,
};

export default widgetList;