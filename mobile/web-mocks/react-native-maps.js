// Minimal web mock for react-native-maps so the web bundler doesn't try to parse
// native-only internals. This mock preserves MapView and Marker exports used by the app
// but renders simple Views on web.
import React from 'react';
import { View } from 'react-native';

export const PROVIDER_GOOGLE = 'google';

export default function MapView(props) {
  const { style, children } = props;
  return (
    <View style={style}>
      {children}
    </View>
  );
}

export const Marker = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};
