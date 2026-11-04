import React from 'react';
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
        paragraph: { ...type.body, color },
        strong: { color },
        em: { color },
      }}
    />
  );
}
