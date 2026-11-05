import React from 'react';
import { Platform } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';
import { C, type } from '../theme';

export default function RichText({ children, style, color = C.ink, selectable = true }) {
  return (
    <EnrichedMarkdownText
      markdown={String(children || '')}
      flavor="github"
      selectable={selectable}
      containerStyle={style}
      markdownStyle={{
        paragraph: { ...type.body, color, lineHeight: 22 },
        strong: { color, fontWeight: '700' },
        em: { color, fontStyle: 'italic' },
        heading1: { ...type.title, color, marginTop: 8, marginBottom: 4 },
        heading2: { ...type.section, color, marginTop: 6, marginBottom: 4 },
        heading3: { ...type.headline, color, marginTop: 4, marginBottom: 2 },
        code_inline: {
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
          color: C.primaryDark,
          backgroundColor: C.surfaceSecondary,
        },
        code_block: {
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
          color: C.ink,
          backgroundColor: C.surfaceSecondary,
        },
        link: {
          color: C.primary,
          textDecorationLine: 'underline',
        },
      }}
    />
  );
}
