import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, Text } from 'react-native';

type ExternalLinkProps = {
  href: string;
  children: ReactNode;
  style?: ComponentProps<typeof Pressable>['style'];
};

/** 앱 외부 URL — expo-router typed routes와 분리 */
export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  return (
    <Pressable
      style={style}
      accessibilityRole="link"
      onPress={() => {
        if (Platform.OS === 'web') {
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }
        WebBrowser.openBrowserAsync(href);
      }}
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}
